import { useState, useEffect } from "react";
import { api } from "./api.js";
import ItemCard, { typeInfo } from "./components/ItemCard.jsx";
import AddMaterialModal from "./components/AddMaterialModal.jsx";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "note", label: "Notes" },
  { key: "text", label: "Text" },
  { key: "pdf", label: "PDFs" },
  { key: "image", label: "Images" },
  { key: "youtube", label: "YouTube" },
  { key: "website", label: "Websites" },
  { key: "other", label: "Other" },
];

export default function TopicPage({ topicId, onBack, onOpenItem }) {
  const [topic, setTopic] = useState(null);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const loadItems = () =>
    api
      .getItems(topicId, { q, type: filter })
      .then(setItems)
      .catch((e) => setError(e.message));

  useEffect(() => {
    api.getTopic(topicId).then(setTopic).catch((e) => setError(e.message));
  }, [topicId]);

  useEffect(() => {
    loadItems();
  }, [topicId, q, filter]);

  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api.deleteItem(id);
      loadItems();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <button className="btn link" onClick={onBack}>
        ← All topics
      </button>

      <header className="topic-header">
        <div>
          <h1>{topic ? topic.name : "..."}</h1>
          {topic && topic.description && <p className="muted">{topic.description}</p>}
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>
          + Add Material
        </button>
      </header>

      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search this research..."
      />

      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {items.length === 0 ? (
        <div className="empty-state">
          <h2>No matching material</h2>
          <p>{q || filter !== "all" ? "Try a different search or filter." : 'Click "+ Add Material" to save your first item.'}</p>
        </div>
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onOpen={() => onOpenItem(item.id, topicId)}
              onDelete={deleteItem}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddMaterialModal
          topicId={topicId}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            loadItems();
          }}
        />
      )}
    </div>
  );
}

export { FILTERS };
