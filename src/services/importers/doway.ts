import type { Importer } from "@/services/importers/base";
import type { NormalizedLessonSource, MindMapNode, TranscriptLine } from "@/lib/types";

// --- SSRF guard -------------------------------------------------------
// The server must never fetch an arbitrary URL a user pastes in. Only
// these hostnames, over https, matching the /share/{id} pattern, are
// ever passed to fetch()/Playwright.
const ALLOWED_HOSTS = new Set(["www.dowayai.com", "dowayai.com"]);
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function parseShareUrl(url: string): { hostname: string; shareId: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;
  const match = parsed.pathname.match(/\/share\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) return null;
  const shareId = match[1];
  if (!SHARE_ID_PATTERN.test(shareId)) return null;
  return { hostname: parsed.hostname, shareId };
}

const FETCH_TIMEOUT_MS = 10_000;
const RENDER_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; ResearchNotesBot/1.0; +lesson-importer)",
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Recursively search a parsed JSON blob for fields that look like lesson content. */
function heuristicExtract(obj: unknown, depth = 0): Partial<{
  title: string;
  summary: string;
  transcript: TranscriptLine[];
  mindMap: MindMapNode;
  audioUrl: string;
}> {
  const found: ReturnType<typeof heuristicExtract> = {};
  if (!obj || typeof obj !== "object" || depth > 6) return found;

  const visit = (node: unknown, d: number) => {
    if (!node || d > 6) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, d + 1);
      return;
    }
    if (typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const k = key.toLowerCase();
      if (!found.title && /^title$/.test(k) && typeof value === "string") {
        found.title = value;
      }
      if (!found.summary && /summary/.test(k) && typeof value === "string") {
        found.summary = value;
      }
      if (!found.audioUrl && /audio/.test(k) && typeof value === "string") {
        found.audioUrl = value;
      }
      if (!found.transcript && /transcript/.test(k) && Array.isArray(value)) {
        found.transcript = value as TranscriptLine[];
      }
      if (!found.mindMap && /mind\s*map|mindmap/.test(k) && value && typeof value === "object") {
        found.mindMap = value as MindMapNode;
      }
      if (value && typeof value === "object") visit(value, d + 1);
    }
  };
  visit(obj, depth);
  return found;
}

/** Strategy A: plain HTTP fetch, looking for embedded JSON (Next.js __NEXT_DATA__, etc). */
async function strategyA(
  shareUrl: string
): Promise<ReturnType<typeof heuristicExtract> | null> {
  const res = await fetchWithTimeout(shareUrl, FETCH_TIMEOUT_MS);
  if (!res.ok) return null;
  const html = await res.text();

  const candidates: unknown[] = [];
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextDataMatch) {
    try {
      candidates.push(JSON.parse(nextDataMatch[1]));
    } catch {
      /* ignore parse error */
    }
  }
  const jsonScriptMatches = html.matchAll(
    /<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g
  );
  for (const m of jsonScriptMatches) {
    try {
      candidates.push(JSON.parse(m[1]));
    } catch {
      /* ignore */
    }
  }

  if (candidates.length === 0) return null;
  for (const c of candidates) {
    const extracted = heuristicExtract(c);
    if (extracted.summary || extracted.transcript || extracted.mindMap) {
      return extracted;
    }
  }
  return null;
}

/** Strategy B: headless-render the JS-driven share page with Playwright. */
async function strategyB(
  shareUrl: string
): Promise<ReturnType<typeof heuristicExtract> | null> {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return null; // playwright not available in this runtime
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(shareUrl, {
      waitUntil: "networkidle",
      timeout: RENDER_TIMEOUT_MS,
    });

    const title = await page.title().catch(() => undefined);

    // Best-effort: the source page's DOM structure is unknown ahead of time, so we
    // look for common content-region conventions rather than a fixed
    // selector, and fall back to nothing if none match.
    const text = await page
      .evaluate(() => {
        const pick = (sel: string) =>
          document.querySelector(sel)?.textContent?.trim() || undefined;
        return {
          summary:
            pick('[data-testid*="summary" i]') ||
            pick('[class*="summary" i]') ||
            undefined,
          transcript:
            pick('[data-testid*="transcript" i]') ||
            pick('[class*="transcript" i]') ||
            undefined,
        };
      })
      .catch(() => ({ summary: undefined, transcript: undefined }));

    if (!text.summary && !text.transcript && !title) return null;

    return {
      title,
      summary: text.summary,
      transcript: text.transcript
        ? [{ text: text.transcript }]
        : undefined,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

export const dowayImporter: Importer = {
  provider: "doway",

  detect(url: string): boolean {
    return parseShareUrl(url) !== null;
  },

  extractId(url: string): string | null {
    return parseShareUrl(url)?.shareId ?? null;
  },

  async fetchAndNormalize(url: string): Promise<NormalizedLessonSource> {
    const parsed = parseShareUrl(url);
    if (!parsed) {
      return {
        provider: "doway",
        sourceUrl: url,
        externalId: "",
        importStatus: "FAILED",
        errorMessage: "這不是有效的課程錄音分享網址",
      };
    }

    const { shareId } = parsed;
    const canonicalUrl = `https://www.dowayai.com/share/${shareId}`;

    let extracted: ReturnType<typeof heuristicExtract> | null = null;
    let strategyUsed: "A" | "B" | "C" = "C";
    let rawDebug: unknown = null;

    try {
      extracted = await strategyA(canonicalUrl);
      if (extracted) strategyUsed = "A";
    } catch (err) {
      rawDebug = { strategyAError: String(err) };
    }

    if (!extracted) {
      try {
        extracted = await strategyB(canonicalUrl);
        if (extracted) strategyUsed = "B";
      } catch (err) {
        rawDebug = { ...(rawDebug as object), strategyBError: String(err) };
      }
    }

    if (!extracted) {
      // Never fail the Lesson itself. Preserve the source URL; since this
      // is a one-time extraction (not an ongoing sync), any gap from here
      // can only be closed by pasting or uploading content manually.
      return {
        provider: "doway",
        sourceUrl: canonicalUrl,
        externalId: shareId,
        importStatus: "FAILED",
        errorMessage:
          "課程錄音內容目前無法自動讀取。原始連結已保存，課程已成功建立。你可以手動貼上逐字稿/摘要，或開啟原始頁面查看。",
        rawData: rawDebug,
      };
    }

    const gotSummary = !!extracted.summary;
    const gotTranscript = !!extracted.transcript;
    const gotMindMap = !!extracted.mindMap;
    const allThree = gotSummary && gotTranscript && gotMindMap;

    return {
      provider: "doway",
      sourceUrl: canonicalUrl,
      externalId: shareId,
      importStatus: allThree ? "IMPORTED" : "PARTIAL",
      title: extracted.title ?? null,
      summary: extracted.summary ?? null,
      transcript: extracted.transcript ?? null,
      mindMap: extracted.mindMap ?? null,
      audioUrl: extracted.audioUrl ?? null,
      rawData: { strategyUsed, extracted },
    };
  },
};
