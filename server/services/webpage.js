// Website service: fetch a real page server-side and extract readable text.
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const MAX_BYTES = 2_500_000;

export async function fetchReadableText(url) {
  if (!/^https?:\/\//i.test(url || ""))
    return { ok: false, reason: "Not a valid http(s) URL." };

  let res;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return { ok: false, reason: `Could not reach the website: ${e.message}` };
  }
  if (!res.ok) return { ok: false, reason: `Website returned HTTP ${res.status}.` };

  const ctype = res.headers.get("content-type") || "";
  if (/application\/pdf/i.test(ctype))
    return { ok: false, reason: "URL points to a PDF; save it as a PDF source instead." };
  if (!/text\/html|text\/plain|application\/xhtml/i.test(ctype))
    return { ok: false, reason: `Unsupported content type (${ctype || "unknown"}).` };

  const raw = await res.text();
  if (raw.length > MAX_BYTES)
    return { ok: false, reason: "Page too large to process." };

  const $ = cheerio.load(raw);
  $("script, style, noscript, svg, nav, footer, header, aside, form, iframe").remove();
  $("[role=navigation], [aria-hidden=true], .nav, .menu, .sidebar, .footer, .header, .advert, .ad, .cookie").remove();

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").first().text() ||
    "";

  // Prefer <article>/<main> content when present
  const scope = $("article").length ? $("article") : $("main").length ? $("main") : $.root();
  let text = scope.text();

  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(\S)\n(\S)/g, "$1 $2")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n\n");

  // strip obvious junk lines (menus, share buttons etc.)
  text = text
    .split("\n\n")
    .filter((p) => !(p.length < 25 && /^(share|tweet|menu|login|sign in|subscribe|home|search|advertisement)/i.test(p)))
    .join("\n\n");

  if (text.replace(/\s/g, "").length < 200)
    return { ok: false, reason: "Page retrieved but contained no substantial readable text (may require JavaScript or login)." };

  return {
    ok: true,
    text: text.slice(0, 18000),
    title: title.trim().slice(0, 200),
    finalUrl: res.url,
  };
}
