import { useState } from "react";
import { typeInfo } from "./components/ItemCard.jsx";

function sourceLinkLabel(type) {
  if (type === "youtube") return "Open on YouTube";
  if (type === "website") return "Open Website";
  if (type === "pdf") return "Open PDF";
  if (type === "image") return "View Image";
  return "View Source";
}

export default function SummaryPage({ topic, result, onBack, onRegenerate, onViewSource, busy }) {
  const [copied, setCopied] = useState(false);
  const { summary, keyPoints, limitations, analyzed, failed, analyzedCount, selectedCount } = result;

  const copy = async () => {
    const text = [
      `Summary — ${topic.name}`,
      `Based on ${analyzedCount} of ${selectedCount} selected sources`,
      "",
      summary,
      keyPoints.length ? "\nKey Points:\n" + keyPoints.map((k, i) => `${i + 1}. ${k}`).join("\n") : "",
      limitations ? `\nLimitations & Disagreements:\n${limitations}` : "",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="container narrow">
      <button className="btn link" onClick={onBack}>← Back to Research</button>

      <header className="summary-header">
        <h1>Summary</h1>
        <p className="summary-topic">{topic.name}</p>
        <p className="muted">
          Based on <strong>{analyzedCount}</strong> of {selectedCount} selected sources
          {failed.length > 0 && <> · {failed.length} source{failed.length > 1 ? "s" : ""} could not be analyzed</>}
        </p>
      </header>

      <article className="card summary-card">
        <h2>Overall Summary</h2>
        {summary.split(/\n{2,}/).map((p, i) => (
          <p className="summary-para" key={i}>{p}</p>
        ))}

        {limitations && (
          <>
            <h2>LIMITATIONS &amp; DISAGREEMENTS</h2>
            {limitations.split(/\n{2,}/).map((p, i) => (
              <p className="summary-para" key={i}>{p}</p>
            ))}
          </>
        )}

        {keyPoints.length > 0 && (
          <>
            <h2>KEY POINTS</h2>
            <ol className="key-points">
              {keyPoints.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ol>
          </>
        )}
      </article>

      <section className="sources-section">
        <h2>Sources Analyzed ({analyzed.length})</h2>
        <div className="source-list">
          {analyzed.map((s) => {
            const info = typeInfo(s.type);
            return (
              <div className="card source-row" key={s.id}>
                <div>
                  <h4>{s.title}</h4>
                  <span className={`badge badge-${s.type}`}>{info.icon} {info.label}</span>
                </div>
                {s.url ? (
                  <a className="btn small" href={s.url} target="_blank" rel="noreferrer">
                    {sourceLinkLabel(s.type)} ↗
                  </a>
                ) : (
                  <button className="btn small" onClick={() => onViewSource(s.id)}>
                    View Source
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {failed.length > 0 && (
          <>
            <h2 className="failed-title">Sources That Could Not Be Analyzed ({failed.length})</h2>
            <div className="source-list">
              {failed.map((s) => {
                const info = typeInfo(s.type);
                return (
                  <div className="card source-row failed-row" key={s.id}>
                    <div>
                      <h4>{s.title}</h4>
                      <span className={`badge badge-${s.type}`}>{info.icon} {info.label}</span>
                      <p className="fail-reason">Reason: {s.reason}</p>
                    </div>
                    {s.url && (
                      <a className="btn small" href={s.url} target="_blank" rel="noreferrer">
                        {sourceLinkLabel(s.type)} ↗
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <div className="detail-actions summary-actions">
        <button className="btn small" onClick={copy}>
          {copied ? "✓ Copied" : "Copy Summary"}
        </button>
        <button className="btn small" onClick={onRegenerate} disabled={busy}>
          Regenerate
        </button>
        <button className="btn primary small" onClick={onBack}>
          Back to Research
        </button>
      </div>
    </div>
  );
}
