import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { db, seed } from "./db.js";

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
