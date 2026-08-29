// Modular AI summarization service.
// Provider is configurable via environment variables; never hardcode keys.
//
//   OPENAI_API_KEY   (required to enable summarization)
//   OPENAI_BASE_URL  (optional, default https://api.openai.com/v1)
//   OPENAI_MODEL     (optional, default gpt-4o-mini)

export function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM_PROMPT = `You are a research summarization assistant.

Summarize ONLY the content provided in the selected sources.

Do not use outside knowledge.
Do not invent facts, statistics, studies, quotes, or conclusions.
If the sources disagree, explicitly mention the disagreement.
Distinguish between claims made by the sources and conclusions that can reasonably be drawn from them.

Produce:
1. An overall summary (several clear paragraphs).
2. Key points (the most important findings, as a numbered list of 3-7 items).
3. Important disagreements, limitations, or uncertainty when present.

Do not claim to have analyzed a source whose content was not provided.`;

function buildUserPrompt(sources) {
  const parts = sources.map((s, i) => {
    const meta = [
      `SOURCE ${i + 1}`,
      `Title: ${s.title}`,
      `Type: ${s.type}`,
      s.url ? `URL: ${s.url}` : null,
      `Content:`,
      s.content,
    ]
      .filter(Boolean)
      .join("\n");
    return meta;
  });
  return `${parts.join("\n\n---\n\n")}

---

Based ONLY on the sources above, respond in strict JSON with this shape:
{
  "summary": "overall summary in markdown-free plain paragraphs separated by blank lines",
  "keyPoints": ["point 1", "point 2", ...],
  "limitations": "disagreements/limitations/uncertainty across the sources, or an empty string if none"
}`;
}

export async function summarizeSources(sources) {
  if (!isConfigured())
    return {
      ok: false,
      code: "not_configured",
      error:
        "Summarization is not configured yet. Add the AI API key to the server environment.",
    };

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(sources) },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (e) {
    return { ok: false, code: "network", error: `AI request failed: ${e.message}` };
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || "";
    } catch {}
    return {
      ok: false,
      code: "ai_error",
      error: `The AI service returned an error (${res.status}).${detail ? " " + detail : ""}`,
    };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: "ai_error", error: "Could not parse the AI response." };
  }

  const raw = data.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, ""));
  } catch {
    // fallback: treat whole response as summary text
    parsed = { summary: raw.trim(), keyPoints: [], limitations: "" };
  }
  if (!parsed.summary || !String(parsed.summary).trim())
    return { ok: false, code: "ai_error", error: "The AI returned an empty summary. Try again." };

  return {
    ok: true,
    summary: String(parsed.summary).trim(),
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.map((k) => String(k)).filter(Boolean).slice(0, 10)
      : [],
    limitations: String(parsed.limitations || "").trim(),
    model,
  };
}
