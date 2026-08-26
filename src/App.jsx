import { useState, useEffect } from "react";
import { api } from "./api.js";
import TopicCard from "./components/TopicCard.jsx";
import NewTopicModal from "./components/NewTopicModal.jsx";
import TopicPage from "./TopicPage.jsx";
import ItemPage from "./ItemPage.jsx";

export default function App() {
  const [view, setView] = useState({ page: "dashboard" });
  const [topics, setTopics] = useState(null);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [error, setError] = useState("");

  const loadTopics = () =>
    api
      .getTopics()
      .then(setTopics)
      .catch((e) => setError(e.message));

  useEffect(() => {
    loadTopics();
  }, []);

  const openTopic = (id) => setView({ page: "topic", topicId: id });
  const openItem = (id, topicId) => setView({ page: "item", itemId: id, topicId });
  const backToDashboard = () => {
    loadTopics();
    setView({ page: "dashboard" });
  };

  if (view.page === "item") {
    return (
      <ItemPage
        itemId={view.itemId}
        onBack={() => setView({ page: "topic", topicId: view.topicId })}
        onDeleted={() => setView({ page: "topic", topicId: view.topicId })}
      />
    );
  }

  if (view.page === "topic") {
    return <TopicPage topicId={view.topicId} onBack={backToDashboard} onOpenItem={openItem} />;
  }

  return (
    <div className="container">
      {error && <div className="error-banner">{error}</div>}
      <header className="hero">
        <div className="brand" onClick={backToDashboard}>
          <span className="logo">RV</span>
          <h1>ResearchVault</h1>
        </div>
        <p className="tagline">Keep everything you find. Find everything you keep.</p>
      </header>

      <div className="dashboard-actions">
        <button className="btn primary" onClick={() => setShowNewTopic(true)}>
          + New Research Topic
        </button>
      </div>

      {topics === null ? (
        <p className="muted">Loading topics...</p>
      ) : topics.length === 0 ? (
        <div className="empty-state">
          <h2>No research topics yet</h2>
          <p>Create your first topic to start collecting material in one place.</p>
        </div>
      ) : (
        <div className="card-grid">
          {topics.map((t) => (
            <TopicCard key={t.id} topic={t} onOpen={() => openTopic(t.id)} />
          ))}
        </div>
      )}

      {showNewTopic && (
        <NewTopicModal
          onClose={() => setShowNewTopic(false)}
          onCreate={(id) => {
            setShowNewTopic(false);
            loadTopics();
            openTopic(id);
          }}
        />
      )}
    </div>
  );
}
