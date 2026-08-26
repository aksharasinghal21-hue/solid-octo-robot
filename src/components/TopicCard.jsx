export default function TopicCard({ topic, onOpen }) {
  return (
    <button className="topic-card card" onClick={onOpen}>
      <h3>{topic.name}</h3>
      <p className="desc">{topic.description || "No description"}</p>
      <div className="meta">
        <span>{topic.item_count} items</span>
        <span>Updated {new Date(topic.updated_at + "Z").toLocaleDateString()}</span>
      </div>
    </button>
  );
}
