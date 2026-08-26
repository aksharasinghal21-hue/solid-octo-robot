import { useState, useEffect } from "react";
import { api } from "./api.js";
import { typeInfo } from "./components/ItemCard.jsx";

export default function ItemPage({ itemId, onBack, onDeleted }) {
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getItem(itemId).then(setItem).catch((e) => setError(e.message));
  }, [itemId]);

  const remove = async () => {
    if (!confirm("Delete this item?")) return;
    try {
      await api.deleteItem(itemId);
      onDeleted();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) {
    return (
      <div className="container">
        <button className="btn link" onClick={onBack}>← Back</button>
        <div className="error-banner">{error}</div>
      </div>
    );
  }
  if (!item) return <div className="container"><p className="muted">Loading...</p></div>;

  const info = typeInfo(item.type);
  const isImage = item.type === "image";
  const isPdf = item.type === "pdf";

  return (
    <div className="container narrow">
      <button className="btn link" onClick={onBack}>← Back to topic</button>

      <div className="card detail-card">
        <div className="item-head">
          <span className={`badge badge-${item.type}`}>{info.icon} {info.label}</span>
          <span className="date">Added {new Date(item.created_at + "Z").toLocaleDateString()}</span>
        </div>

        <h1>{item.title}</h1>

        {item.url && (
          <p>
            Source:{" "}
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.url}
            </a>
          </p>
        )}

        {(item.type === "note" || item.type === "text") && (
          <pre className="content-block">{item.content}</pre>
        )}

        {isImage && item.file_url && (
          <img className="file-preview" src={item.file_url} alt={item.title} />
        )}
        {isPdf && item.file_url && (
          <iframe className="file-frame" src={item.file_url} title={item.title} />
        )}
        {!isImage && !isPdf && item.file && (
          <p>
            <a className="btn small" href={item.file_url} target="_blank" rel="noreferrer">
              Download file
            </a>
          </p>
        )}

        {item.tags.length > 0 && (
          <div className="tags-row">
            {item.tags.map((t) => (
              <span key={t} className="tag">#{t}</span>
            ))}
          </div>
        )}

        <div className="detail-actions">
          <button className="btn small danger-outline" onClick={remove}>Delete</button>
        </div>
      </div>
    </div>
  );
}
