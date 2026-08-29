export default function ItemCard({ item, onOpen, onDelete, selected, onToggleSelect }) {
  const info = typeInfo(item.type);
  const preview =
    item.type === "note" || item.type === "text"
      ? item.content
      : item.url || (item.file ? `File: ${item.file}` : "");

  return (
    <div className={`item-card card ${selected ? "selected" : ""}`}>
      <div className="item-head">
        <label className="select-box" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
          />
          <span>Select</span>
        </label>
        <span className="date">{new Date(item.created_at + "Z").toLocaleDateString()}</span>
      </div>
      <div className="item-type-row">
        <span className={`badge badge-${item.type}`}>
          {info.icon} {info.label}
        </span>
        {item.url && (
          <a
            className="open-link"
            href={item.url}
            target="_blank"
            rel="noreferrer"
            title={info.label === "YouTube" ? "Open on YouTube" : "Open Website"}
            onClick={(e) => e.stopPropagation()}
          >
            ↗
          </a>
        )}
      </div>
      <h4 onClick={onOpen} role="button">
        {item.title}
      </h4>
      <p className="preview">{preview.slice(0, 140)}{preview.length > 140 ? "…" : ""}</p>
      <div className="tags-row">
        {item.tags.map((t) => (
          <span key={t} className="tag">#{t}</span>
        ))}
      </div>
      <div className="item-actions">
        <button className="btn small" onClick={onOpen}>View</button>
        <button className="btn small danger-outline" onClick={() => onDelete(item.id)}>Delete</button>
      </div>
    </div>
  );
}

export function typeInfo(type) {
  return TYPES[type] || TYPES.other;
}

const TYPES = {
  note: { label: "Note", icon: "📝" },
  text: { label: "Text", icon: "📋" },
  pdf: { label: "PDF", icon: "📄" },
  image: { label: "Image", icon: "🖼️" },
  youtube: { label: "YouTube", icon: "▶️" },
  website: { label: "Website", icon: "🔗" },
  other: { label: "Other", icon: "📎" },
};
