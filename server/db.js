import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(__dirname, "researchvault.db");
const reset = process.argv.includes("--reset");
if (reset && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note','text','pdf','image','youtube','website','other')),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  url TEXT DEFAULT '',
  file TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_topic ON items(topic_id);
`);

function buildPdf(title, lines) {
  const esc = (s) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const parts = [`BT /F1 18 Tf 50 760 Td (${esc(title)}) Tj ET`];
  lines.forEach((l, i) => {
    parts.push(`BT /F1 11 Tf 50 ${730 - i * 20} Td (${esc(l)}) Tj ET`);
  });
  const stream = parts.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

function chartSvg(title, color1, color2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
<rect width="800" height="500" fill="#f8fafc"/>
<text x="400" y="45" font-family="Helvetica" font-size="24" text-anchor="middle" fill="#1e293b">${title}</text>
<g transform="translate(80,80)">
${[210, 160, 250, 120, 300, 190].map(
  (h, i) => `<rect x="${i * 110}" y="${340 - h}" width="70" height="${h}" rx="6" fill="${i % 2 ? color2 : color1}"/>`
).join("\n")}
<line x1="0" y1="340" x2="640" y2="340" stroke="#94a3b8"/>
</g>
<text x="400" y="480" font-family="Helvetica" font-size="14" text-anchor="middle" fill="#64748b">Sample chart saved as research material</text>
</svg>`;
}

function seed() {
  const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (userCount > 0) return;

  db.prepare("INSERT INTO users (name, email) VALUES (?, ?)").run(
    "Demo Researcher",
    "demo@researchvault.app"
  );
  const userId = db.prepare("SELECT id FROM users LIMIT 1").get().id;

  const insertTopic = db.prepare(
    "INSERT INTO topics (user_id, name, description) VALUES (?, ?, ?)"
  );
  const insertItem = db.prepare(
    `INSERT INTO items (topic_id, type, title, content, url, file, tags)
     VALUES (@topic_id, @type, @title, @content, @url, @file, @tags)`
  );

  // --- AI in Healthcare ---
  const ai = insertTopic.run(
    userId,
    "AI in Healthcare",
    "How artificial intelligence is transforming diagnosis, treatment and patient care."
  ).lastInsertRowid;

  // Seed files
  const img1 = "seed-ai-adoption-chart.svg";
  const img2 = "seed-mri-example.svg";
  const pdf1 = "seed-ai-in-healthcare-overview.pdf";
  fs.writeFileSync(path.join(uploadsDir, img1), chartSvg("AI Adoption in Hospitals (2018-2025)", "#4f46e5", "#818cf8"));
  fs.writeFileSync(path.join(uploadsDir, img2), chartSvg("MRI Scan Accuracy: AI vs Radiologists", "#0ea5e9", "#38bdf8"));
  fs.writeFileSync(
    path.join(uploadsDir, pdf1),
    buildPdf("AI in Healthcare - Overview Notes", [
      "1. Machine learning models now match specialists in imaging tasks such as",
      "   detecting diabetic retinopathy, skin cancer and breast cancer screening.",
      "",
      "2. Key challenge: most clinical AI tools are trained on narrow datasets and",
      "   struggle to generalize across hospitals and populations.",
      "",
      "3. Regulatory landscape: FDA has approved 500+ AI-enabled medical devices.",
      "",
      "4. Open questions for the dissertation:",
      "   - Bias in training data and impact on minority populations",
      "   - Explainability requirements for clinicians",
      "   - Cost-effectiveness evidence in real deployments",
    ])
  );

  [
    {
      type: "note",
      title: "Research questions to explore",
      content:
        "1. How accurate is AI compared to human radiologists for cancer detection?\n2. What are the main ethical concerns (bias, privacy, accountability)?\n3. Which hospitals have actually deployed AI at scale?\n4. What do patients think about AI-assisted diagnosis?",
      tags: ["questions", "draft"],
    },
    {
      type: "note",
      title: "Meeting notes - Prof. Sharma (supervisor)",
      content:
        "Focus the dissertation on diagnostic imaging rather than drug discovery.\nFind at least 3 peer-reviewed studies comparing AI vs clinicians.\nLook into the WHO guidance on AI ethics in healthcare (2021).\nNext meeting: bring an outline of chapter 2.",
      tags: ["meeting", "supervisor"],
    },
    {
      type: "text",
      title: "Abstract snippet - Deep learning for cancer detection",
      content:
        "A convolutional neural network trained on 90,000 mammograms achieved an AUC of 0.94 in detecting breast cancer, matching the performance of a panel of board-certified radiologists. The model reduced false negatives by 9.4% compared to independent human readers. Source: McKinney et al., Nature (2020).",
      tags: ["cancer", "deep-learning"],
    },
    {
      type: "text",
      title: "Key statistics copied from report",
      content:
        "- Global AI in healthcare market projected to reach $188B by 2030\n- 86% of hospital leaders say AI will be critical within 5 years\n- AI reduced documentation time by 2.5 hours per clinician per day in pilot studies\n- Cancer detection: AI screening cut review time by 44% in a UK trial",
      tags: ["stats", "cancer", "market"],
    },
    {
      type: "website",
      title: "WHO - Ethics and governance of AI for health",
      content: "",
      url: "https://www.who.int/publications/i/item/9789240029200",
      tags: ["ethics", "who"],
    },
    {
      type: "website",
      title: "NIH - AI in medical imaging overview",
      content: "",
      url: "https://www.nibib.nih.gov/science-education/science-topics/artificial-intelligence-medical-imaging",
      tags: ["imaging", "overview"],
    },
    {
      type: "youtube",
      title: "How AI is transforming medicine (explained simply)",
      content: "",
      url: "https://www.youtube.com/watch?v=5Or5vGxN4Os",
      tags: ["intro", "video"],
    },
    {
      type: "youtube",
      title: "Google Health: detecting breast cancer with AI",
      content: "",
      url: "https://www.youtube.com/watch?v=H3EwPIQKZjM",
      tags: ["cancer", "google", "video"],
    },
    {
      type: "image",
      title: "Screenshot - AI adoption chart",
      content: "",
      file: img1,
      tags: ["chart", "adoption"],
    },
    {
      type: "image",
      title: "Screenshot - MRI accuracy comparison",
      content: "",
      file: img2,
      tags: ["mri", "accuracy"],
    },
    {
      type: "pdf",
      title: "AI in Healthcare - Overview notes (PDF)",
      content: "",
      file: pdf1,
      tags: ["notes", "pdf"],
    },
  ].forEach((item) =>
    insertItem.run({ topic_id: ai, url: "", file: "", ...item, tags: JSON.stringify(item.tags) })
  );

  // --- Climate Change ---
  const climate = insertTopic.run(
    userId,
    "Climate Change",
    "Evidence, impacts and policy responses to global climate change."
  ).lastInsertRowid;
  [
    {
      type: "note",
      title: "Sources checklist for essay",
      content: "IPCC AR6 summary - done\nNASA vital signs page - done\nNeed one counterargument source",
      tags: ["essay"],
    },
    {
      type: "website",
      title: "IPCC Sixth Assessment Report",
      content: "",
      url: "https://www.ipcc.ch/assessment-report/ar6/",
      tags: ["ipcc", "report"],
    },
    {
      type: "youtube",
      title: "Climate change explained in 5 minutes",
      content: "",
      url: "https://www.youtube.com/watch?v=G4H1N_yXBiA",
      tags: ["intro"],
    },
  ].forEach((item) =>
    insertItem.run({ topic_id: climate, url: "", file: "", ...item, tags: JSON.stringify(item.tags) })
  );

  // --- Electric Vehicles ---
  const ev = insertTopic.run(
    userId,
    "Electric Vehicles",
    "Battery technology, charging infrastructure and EV adoption trends."
  ).lastInsertRowid;
  [
    {
      type: "note",
      title: "Battery cost trend numbers",
      content: "Lithium-ion pack prices fell from $1,200/kWh (2010) to ~$139/kWh (2023).",
      tags: ["battery", "cost"],
    },
    {
      type: "text",
      title: "Copied paragraph - charging infrastructure gap",
      content:
        "Public charging points remain unevenly distributed: urban areas have 4x more chargers per capita than rural regions, which remains a key barrier to mass EV adoption.",
      tags: ["charging"],
    },
  ].forEach((item) =>
    insertItem.run({ topic_id: ev, url: "", file: "", ...item, tags: JSON.stringify(item.tags) })
  );
}

if (reset) {
  console.log("Database reset and reseeded.");
}

export { seed };
