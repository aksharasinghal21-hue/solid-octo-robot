import { useState } from "react";
import { api } from "../api.js";

const TABS = ["text", "link", "file", "note"];

export default function AddMaterialModal({ topicId, onClose, onAdded }) {
  const [tab, setTab] = useState("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // text body or note body
  const [url, setUrl] = useState("");
  const [linkKind, setLinkKind] = useState("website");
  const [file, setFile] = useState(null);
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      if (tab === "text") fd.set("type", "text");
      if (tab === "note") fd.set("type", "note");
      if (tab === "link") fd.set("type", linkKind);
      if (tab === "file") {
        if (!file) throw new Error("Choose a file to upload");
        const ext = file.name.split(".").pop().toLowerCase();
        const kind =
          ["pdf"].includes(ext)
            ? "pdf"
            : ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)
              ? "image"
              : "other";
        fd.set("type", kind);
        fd.set("file", file);
      }
      fd.set("title", title);
      if (tab === "text" || tab === "note") fd.set("content", content);
      if (tab === "link") fd.set("url", url);
      fd.set("tags", tags);
      await api.addItem(topicId, fd);
      onAdded();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal card wide" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2>Add Material</h2>
        <div className="tab-row">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <label>
          Title
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              tab === "text" ? "e.g. Abstract - Deep learning for cancer detection"
                : tab === "link" ? "e.g. WHO report on AI ethics"
                : tab === "file" ? "e.g. Screenshot of results table"
                : "e.g. Meeting notes with supervisor"
            }
            required
          />
        </label>

        {(tab === "text" || tab === "note") && (
          <label>
            {tab === "text" ? "Pasted text" : "Note"}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder={tab === "text" ? "Paste copied text here..." : "Write your note..."}
            />
          </label>
        )}

        {tab === "link" && (
          <>
            <label>
              URL
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </label>
            <label>
              Link type
              <select value={linkKind} onChange={(e) => setLinkKind(e.target.value)}>
                <option value="website">Website</option>
                <option value="youtube">YouTube</option>
                <option value="other">Other</option>
              </select>
            </label>
          </>
        )}

        {tab === "file" && (
          <label>
            File (PDF, image, screenshot, document)
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.doc,.docx,.txt"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
          </label>
        )}

        <label>
          Tags (optional, comma separated)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="cancer, deep-learning, video"
          />
        </label>

        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy || !title.trim()}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
