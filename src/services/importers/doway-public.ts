import { z } from "zod";
import type { MindMapNode, NormalizedLessonSource, TranscriptLine } from "@/lib/types";

const payloadSchema = z.object({
  title: z.string().optional(), summary: z.string().optional(), context: z.unknown(),
  duration: z.coerce.number().finite().nonnegative().optional(),
  mindMap: z.union([z.number(), z.string()]).optional(),
  showSummary: z.union([z.number(), z.string()]).nullish(),
  speaker: z.union([z.number(), z.string()]).optional(),
});
const segmentSchema = z.object({
  text: z.string(), start: z.number().finite().nonnegative().optional(),
  end: z.number().finite().nonnegative().optional(), speakerName: z.string().nullish(),
  id: z.union([z.string(), z.number()]).optional(),
});
function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}
export function formatSourceTime(seconds: number): string {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  return [ ...(hours ? [String(hours).padStart(2, "0")] : []), String(Math.floor(total / 60) % 60).padStart(2, "0"), String(total % 60).padStart(2, "0") ].join(":");
}

// The share page's mindMap field is an enabled flag. Its own renderer uses
// the summary Markdown as the mind-map input; preserve that same outline.
export function summaryOutline(markdown: string, title: string): MindMapNode {
  const root: MindMapNode = { name: title, children: [] };
  const stack: { level: number; node: MindMapNode }[] = [{ level: -1, node: root }];
  let headingLevel = 0;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const bullet = /^(\s*)(?:[-*+] |\d+[.)] )\s*(.+)$/.exec(line);
    if (!heading && !bullet) continue;
    if (heading) headingLevel = heading[1].length;
    const level = heading ? headingLevel : headingLevel + 1 + bullet![1].replace(/\t/g, "    ").length;
    const name = (heading ? heading[2] : bullet![2]).replace(/\*\*/g, "").trim();
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
    const node: MindMapNode = { name, children: [] };
    (stack[stack.length - 1].node.children ??= []).push(node);
    stack.push({ level, node });
  }
  return root;
}

export function normalizePublicShare(response: unknown, shareId: string): NormalizedLessonSource | null {
  const envelope = z.object({ code: z.number(), data: z.unknown(), audioUrl: z.string().nullish() }).safeParse(response);
  if (!envelope.success || envelope.data.code !== 200) return null;
  const parsed = payloadSchema.safeParse(parseJson(envelope.data.data));
  if (!parsed.success) return null;
  const data = parsed.data;
  const summary = String(data.showSummary ?? "1") === "1" ? data.summary?.trim() || null : null;
  const segments = z.array(segmentSchema).safeParse(parseJson(data.context));
  const transcript: TranscriptLine[] = segments.success ? segments.data.filter(s => s.text.trim()).map(s => ({
    text: s.text,
    ...(s.id !== undefined ? { sourceSegmentId: String(s.id) } : {}),
    ...(s.start !== undefined ? { time: formatSourceTime(s.start / 1000) } : {}),
    ...(s.end !== undefined ? { endTime: formatSourceTime(s.end / 1000) } : {}),
    ...(String(data.speaker) === "1" && s.speakerName ? { speaker: s.speakerName } : {}),
  })) : [];
  const mindMap = String(data.mindMap) === "1" && summary ? summaryOutline(summary, data.title || "課堂概念圖") : null;
  if (!summary && !transcript.length && !mindMap) return null;
  let audioUrl: string | null = null;
  try { const url = new URL(envelope.data.audioUrl || ""); if (url.protocol === "https:") audioUrl = url.href; } catch { /* no public audio */ }
  return {
    provider: "doway", sourceUrl: `https://www.dowayai.com/share/${shareId}`, externalId: shareId,
    title: data.title ?? null, duration: data.duration !== undefined ? formatSourceTime(data.duration) : null,
    summary, transcript: transcript.length ? transcript : null, mindMap, audioUrl,
    importStatus: summary && transcript.length && mindMap ? "IMPORTED" : "PARTIAL",
    rawData: { strategyUsed: "public-share-api", title: data.title, duration: data.duration,
      summary, context: segments.success ? segments.data : null,
      mindMapFormat: mindMap ? "summary-markdown-outline" : null, capturedAt: new Date().toISOString() },
  };
}

export async function fetchPublicShare(shareId: string): Promise<NormalizedLessonSource | null> {
  // Fixed endpoint discovered from the public share page; never user-controlled.
  const response = await fetch("https://www.dowayai.com:8443/api/player/share_get", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: shareId }), redirect: "error", cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  return normalizePublicShare(await response.json(), shareId);
}
