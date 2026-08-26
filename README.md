# solid-octo-robot

This repository contains two independent local apps:

1. **`/` ResearchVault** — a research material organizer MVP (React + Vite + Express + SQLite).
2. **`/ai404` AI:404** — a playable first-person sci-fi puzzle game (Vite + Three.js). Run: `cd ai404 && npm install && npm run dev` → http://localhost:5174

---

# ResearchVault

Keep everything you find. Find everything you keep.

ResearchVault helps students and researchers keep scattered research material — notes, pasted text, links, YouTube videos, PDFs and screenshots — together under one topic, so it can easily be found again later.

## Quick start

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open http://localhost:5173 (the API runs on http://localhost:3001).

The app ships with sample data: the topic **AI in Healthcare** (2 notes, 2 text snippets, 2 website links, 2 YouTube links, 2 images, 1 PDF) plus **Climate Change** and **Electric Vehicles**.

To wipe and reseed the database:

```bash
npm run reset-db
```

## What the MVP does

- **Dashboard** — list of research topics with item counts and last-updated dates; create new topics.
- **Topic page** — search across all saved material in a topic, filter by type (Notes / Text / PDFs / Images / YouTube / Websites / Other), add material.
- **Add material** — paste text, save links (website / YouTube / other), upload files (PDF, images, documents), write notes. Optional tags on everything.
- **Item view** — full detail with file previews (images inline, PDFs embedded), source URL, tags.

Search matches titles, text content, URLs and tags.

## Tech stack

- **Frontend:** React + Vite (no UI framework, plain CSS)
- **Backend:** Express + better-sqlite3
- **Files:** stored locally in `server/uploads/`

## Project structure

```
server/
  index.js   # Express API + file uploads (multer)
  db.js      # SQLite schema + seed data
  uploads/   # uploaded files
src/
  App.jsx        # Dashboard
  TopicPage.jsx  # Topic page: search, filters, feed
  ItemPage.jsx   # Item detail view
  components/    # ItemCard, AddMaterialModal, NewTopicModal, TopicCard
  api.js         # API client
  styles.css     # Design system
```

## Data model

- **users**: id, name, email
- **topics**: id, user_id, name, description, created_at, updated_at
- **items**: id, topic_id, type (`note|text|pdf|image|youtube|website|other`), title, content, url, file, tags (JSON array), created_at, updated_at

The schema is intentionally simple so future features (OCR, PDF text extraction, semantic search, AI summaries) can be added without changes to existing tables.

## License

MIT
