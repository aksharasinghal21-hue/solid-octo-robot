import { useState, useEffect, useRef } from "react";
import { api } from "./api.js";
import ItemCard from "./components/ItemCard.jsx";
import AddMaterialModal from "./components/AddMaterialModal.jsx";
import SummaryPage from "./SummaryPage.jsx";

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

const STAGES = [
  "Collecting source content...",
  "Analyzing selected sources...",
  "Generating summary...",
];

export default function TopicPage({ topicId, onBack, onOpenItem }) {
  const [topic, setTopic] = useState(null);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  // selection + summarization
  const [selected, setSelected] = useState(new Set());
  const [summarizing, setSummarizing] = useState(false);
  const [stage, setStage] = useState(0);
  const [summaryResult, setSummaryResult] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const stageTimer = useRef(null);

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

  useEffect(() => () => clearInterval(stageTimer.current), []);

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAllVisible = () =>
    setSelected(new Set(items.map((i) => i.id)));

  const clearSelection = () => setSelected(new Set());

  const startStages = () => {
    setStage(0);
    stageTimer.current = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      7000
    );
  };
  const stopStages = () => {
    clearInterval(stageTimer.current);
    stageTimer.current = null;
  };

  const runSummarize = async (ids) => {
    const idList = ids || [...selected];
    if (!idList.length) return;
    setSummarizing(true);
    setSummaryError("");
    setShowSummary(false);
    startStages();
    try {
      const result = await api.summarize(idList);
      setSummaryResult({ ...result, selectedIds: idList });
      setShowSummary(true);
      window.scrollTo(0, 0);
    } catch (e) {
      setSummaryError(e.message);
      setShowSummary(true); // show error inside summary area with retry
      setSummaryResult({ error: true });
      window.scrollTo(0, 0);
    } finally {
      stopStages();
      setSummarizing(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api.deleteItem(id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadItems();
    } catch (e) {
      setError(e.message);
    }
  };

  if (showSummary) {
    if (summaryResult && !summaryResult.error) {
      return (
        <SummaryPage
          topic={topic || { name: "" }}
          result={summaryResult}
          busy={summarizing}
          onBack={() => setShowSummary(false)}
          onRegenerate={() => runSummarize(summaryResult.selectedIds)}
          onViewSource={(itemId) => onOpenItem(itemId, topicId)}
        />
      );
    }
    // error view
    return (
      <div className="container narrow">
        <button className="btn link" onClick={() => setShowSummary(false)}>← Back to Research</button>
        <div className="card summary-card summary-error">
          <h2>Summary failed</h2>
          <p className="summary-para">{summaryError}</p>
          <div className="detail-actions">
            <button className="btn small danger-outline" onClick={() => setShowSummary(false)}>
              Back
            </button>
            <button
              className="btn primary small"
              disabled={summarizing || selected.size === 0}
              onClick={() => runSummarize()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Selection bar */}
      <div className={`selection-bar card ${selected.size > 0 ? "active" : ""}`}>
        <span className="sel-count">
          {selected.size > 0
            ? `${selected.size} source${selected.size > 1 ? "s" : ""} selected`
            : "Select sources to summarize"}
        </span>
        <div className="sel-actions">
          <button className="btn small" onClick={selectAllVisible} disabled={items.length === 0}>
            Select All
          </button>
          <button className="btn small" onClick={clearSelection} disabled={selected.size === 0}>
            Clear Selection
          </button>
          <button
            className="btn primary small"
            disabled={selected.size === 0 || summarizing}
            onClick={() => runSummarize()}
          >
            Summarize Selected
          </button>
        </div>
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
              selected={selected.has(item.id)}
              onToggleSelect={toggleSelect}
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

      {/* Loading overlay */}
      {summarizing && (
        <div className="modal-backdrop">
          <div className="card loading-panel">
            <div className="spinner" />
            <p>{STAGES[stage]}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export { FILTERS };
