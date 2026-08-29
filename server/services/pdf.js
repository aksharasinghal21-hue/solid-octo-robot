// PDF service: extract real machine-readable text from stored PDF files.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFParse } from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, "..", "uploads");

export async function extractPdfText(fileName) {
  const filePath = path.join(uploadsDir, fileName);
  if (!fs.existsSync(filePath))
    return { ok: false, reason: "The stored PDF file could not be found on the server." };
  let parser;
  try {
    parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(filePath)) });
    const result = await parser.getText();
    const text = (result.text || "")
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text.replace(/\s/g, "").length < 100)
      return {
        ok: false,
        reason:
          "This PDF does not currently contain extractable text (it may consist of scanned images). OCR is not available yet.",
      };
    const pages = result.pages?.length ?? result.numpages ?? undefined;
    return { ok: true, text: text.slice(0, 24000), pages };
  } catch (e) {
    return { ok: false, reason: `PDF text extraction failed: ${e.message}` };
  } finally {
    try {
      await parser?.destroy();
    } catch {}
  }
}
