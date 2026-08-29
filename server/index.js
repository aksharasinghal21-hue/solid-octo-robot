import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { db, seed } from "./db.js";
import { extractVideoId, fetchTranscript } from "./services/youtube.js";
import { fetchReadableText } from "./services/webpage.js";
import { extractPdfText } from "./services/pdf.js";
import { isConfigured, summarizeSources } from "./services/summarizer.js";

seed();

const app = express();
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9-_ ]/gi, "")
      .slice(0, 60)
      .trim() || "file";
    cb(null, `${base}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  },
});
const upload = multer({ storage });

const parseTags = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const serializeItem = (row) => ({
  ...row,
  tags: parseTags(row.tags),
  file_url: row.file ? `/uploads/${encodeURIComponent(row.file)}` : null,
});

const touchTopic = (topicId) =>
  db.prepare("UPDATE topics SET updated_at = datetime('now') WHERE id = ?").run(topicId);

// ---- Topics ----
app.get("/api/topics", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, COUNT(i.id) AS item_count
       FROM topics t LEFT JOIN items i ON i.topic_id = t.id
       GROUP BY t.id ORDER BY t.updated_at DESC`
    )
    .all();
  res.json(rows);
});

app.post("/api/topics", (req, res) => {
  const { name, description = "" } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  const user = db.prepare("SELECT id FROM users LIMIT 1").get();
  const info = db
    .prepare("INSERT INTO topics (user_id, name, description) VALUES (?, ?, ?)")
    .run(user.id, name.trim(), description.trim());
  const topic = db.prepare("SELECT * FROM topics WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(topic);
});

app.get("/api/topics/:id", (req, res) => {
  const topic = db.prepare("SELECT * FROM topics WHERE id = ?").get(req.params.id);
  if (!topic) return res.status(404).json({ error: "Topic not found" });
  res.json(topic);
});

// ---- Items ----
app.get("/api/topics/:id/items", (req, res) => {
  const { q, type, tag } = req.query;
  let sql = "SELECT * FROM items WHERE topic_id = ?";
  const params = [req.params.id];
  if (q) {
    sql += " AND (title LIKE ? OR content LIKE ? OR url LIKE ? OR tags LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (type && type !== "all") {
    sql += " AND type = ?";
    params.push(type);
  }
  if (tag) {
    sql += " AND tags LIKE ?";
    params.push(`%"${tag}"%`);
  }
  sql += " ORDER BY created_at DESC, id DESC";
  res.json(db.prepare(sql).all(...params).map(serializeItem));
});

app.post("/api/topics/:id/items", upload.single("file"), (req, res) => {
  const topicId = req.params.id;
  const topic = db.prepare("SELECT id FROM topics WHERE id = ?").get(topicId);
  if (!topic) return res.status(404).json({ error: "Topic not found" });

  const { type, title } = req.body;
  const validTypes = ["note", "text", "pdf", "image", "youtube", "website", "other"];
  if (!validTypes.includes(type)) return res.status(400).json({ error: "Invalid type" });
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });

  let tags = [];
  if (typeof req.body.tags === "string") {
    tags = req.body.tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
  }

  const info = db
    .prepare(
      `INSERT INTO items (topic_id, type, title, content, url, file, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      topicId,
      type,
      title.trim(),
      req.body.content || "",
      req.body.url || "",
      req.file ? req.file.filename : "",
      JSON.stringify(tags)
    );
  touchTopic(topicId);
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(serializeItem(item));
});

app.get("/api/items/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Item not found" });
  res.json(serializeItem(row));
});

app.delete("/api/items/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Item not found" });
  if (row.file) {
    const filePath = path.join(uploadsDir, row.file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
  touchTopic(row.topic_id);
  res.json({ ok: true });
});

// ---- Summarization ----

async function resolveSourceContent(item) {
  // Returns { status: "usable", content } or { status: "unavailable", reason }
  const hasText = (t) => (t || "").trim().length > 0;

  if (item.type === "text" || item.type === "note") {
    return hasText(item.content)
      ? { status: "usable", content: item.content.trim().slice(0, 20000) }
      : { status: "unavailable", reason: `This ${item.type} contains no text content.` };
  }

  if (item.type === "youtube") {
    const videoId = extractVideoId(item.url);
    if (!videoId)
      return { status: "unavailable", reason: "The stored URL is not a valid YouTube link." };
    const t = await fetchTranscript(videoId);
    return t.ok
      ? { status: "usable", content: `Video transcript (${t.lang}, track: ${t.trackName}):\n${t.text.slice(0, 24000)}` }
      : { status: "unavailable", reason: t.reason };
  }

  if (item.type === "website") {
    if (!item.url)
      return { status: "unavailable", reason: "No URL is stored for this website source." };
    const w = await fetchReadableText(item.url);
    return w.ok
      ? { status: "usable", content: `Webpage content from ${w.finalUrl || item.url}:\n${w.text}` }
      : { status: "unavailable", reason: w.reason };
  }

  if (item.type === "pdf") {
    if (!item.file)
      return { status: "unavailable", reason: "No PDF file is attached to this item." };
    return await extractPdfText(item.file);
  }

  // image / other
  if (hasText(item.content))
    return { status: "usable", content: item.content.trim().slice(0, 20000) };
  if (item.type === "image")
    return {
      status: "unavailable",
      reason: "This image cannot currently be summarized because readable text (OCR) has not been extracted.",
    };
  return { status: "unavailable", reason: "This source does not contain readable text." };
}

app.post("/api/summarize", async (req, res) => {
  const { itemIds } = req.body || {};
  if (!Array.isArray(itemIds) || itemIds.length === 0)
    return res.status(400).json({ error: "itemIds must be a non-empty array." });
  if (itemIds.length > 10)
    return res.status(400).json({ error: "Please select at most 10 sources per summary." });
  const ids = [...new Set(itemIds.map(Number).filter((n) => Number.isInteger(n)))];
  if (ids.length !== itemIds.length)
    return res.status(400).json({ error: "Invalid item ids supplied." });

  const placeholders = ids.map(() => "?").join(",");
  const rows = db.prepare(`SELECT * FROM items WHERE id IN (${placeholders})`).all(...ids);
  if (rows.length !== ids.length)
    return res.status(404).json({ error: "One or more selected items no longer exist." });

  const meta = (r) => ({ id: r.id, title: r.title, type: r.type, url: r.url || null });
  const analyzed = [];
  const failed = [];

  for (const row of rows) {
    let result;
    try {
      result = await resolveSourceContent(row);
    } catch (e) {
      result = { status: "unavailable", reason: `Content retrieval failed: ${e.message}` };
    }
    if (result.status === "usable") {
      console.log(`[summarize] usable: ${row.type} "${row.title.slice(0, 40)}" (${result.content.length} chars)`);
      analyzed.push({ ...meta(row), content: result.content });
    } else {
      console.log(`[summarize] FAILED: ${row.type} "${row.title.slice(0, 40)}" reason=${JSON.stringify(result.reason)}`);
      failed.push({ ...meta(row), reason: result.reason || "Unknown error." });
    }
  }

  if (analyzed.length === 0)
    return res.status(422).json({
      error: "The selected sources do not contain readable text that can currently be summarized.",
      failed,
      selectedCount: rows.length,
      analyzedCount: 0,
    });

  const ai = await summarizeSources(analyzed);
  if (!ai.ok) {
    const status = ai.code === "not_configured" ? 503 : 502;
    return res.status(status).json({
      error: ai.error,
      code: ai.code,
      failed,
      analyzedCount: analyzed.length,
      selectedCount: rows.length,
    });
  }

  res.json({
    summary: ai.summary,
    keyPoints: ai.keyPoints,
    limitations: ai.limitations,
    model: ai.model,
    analyzedCount: analyzed.length,
    selectedCount: rows.length,
    analyzed: analyzed.map(({ content, ...m }) => m),
    failed,
  });
});

// Uploaded files
app.use("/uploads", express.static(uploadsDir));

// Serve built frontend (production)
const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/(api|uploads)\/).*/, (_req, res) =>
    res.sendFile(path.join(distDir, "index.html"))
  );
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`ResearchVault running on http://localhost:${PORT}`));
