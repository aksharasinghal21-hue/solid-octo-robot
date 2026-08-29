// YouTube service: extract video ID and fetch real captions/transcript.
import { YoutubeTranscript } from "youtube-transcript";

export function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function thumbnailUrl(videoId) {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n/g, " ");
}

/**
 * Fetches the real caption track for a video via youtube-transcript
 * (InnerTube get_transcript under the hood).
 * Returns { ok: true, text, lang } or { ok: false, reason }.
 */
export async function fetchTranscript(videoId, lang = "en") {
  if (!videoId) return { ok: false, reason: "Not a valid YouTube URL." };
  try {
    let segments;
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang });
    } catch (e1) {
      // fall back to default language before giving up
      try {
        segments = await YoutubeTranscript.fetchTranscript(videoId);
      } catch {
        return {
          ok: false,
          reason:
            e1?.message?.includes("Transcript is disabled") ||
            e1?.message?.includes("not found")
              ? "No accessible transcript or captions were found for this video."
              : `Transcript retrieval failed: ${e1.message}`,
        };
      }
    }
    const text = decodeEntities(
      segments.map((s) => s.text).join(" ")
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!text)
      return { ok: false, reason: "Captions exist but contain no readable text." };
    return { ok: true, text, lang };
  } catch (e) {
    return { ok: false, reason: `Transcript retrieval failed: ${e.message}` };
  }
}
