import { query } from "@/lib/db";
import type { StudyData } from "@/lib/study";
import type { TranscriptLine } from "@/lib/types";
export interface SearchResult {
  lessonId: string;
  courseName: string;
  lessonTitle: string;
  date: string;
  matchType: string;
  snippet: string;
  href: string;
  time?: string;
}
export function snippetAround(text: string, q: string, radius = 65) {
  const idx = text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase());
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, Math.max(0, idx) + q.length + radius);
  return (
    (start ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "")
  );
}
interface SearchRow {
  id: string;
  title: string;
  date: string;
  course_name: string;
  summary: string | null;
  transcript: string | null;
  study: string | null;
  notes: string | null;
  tags: string[] | null;
  ideas: { id: string; content: string; source_text: string | null }[] | null;
}
export async function globalSearch(
  queryStr: string,
  filter: { courseId?: string; from?: string; to?: string } = {},
): Promise<SearchResult[]> {
  const q = queryStr.trim().slice(0, 200);
  if (!q) return [];
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await query<SearchRow>(
    `SELECT l.id,l.title,l.date,c.name AS course_name,lc.summary,lc.transcript,s.data AS study,
    (SELECT string_agg(n.content,E'\\n') FROM notes n WHERE n.lesson_id=l.id) AS notes,
    (SELECT array_agg(t.name) FROM tags t JOIN tag_on_lesson tl ON tl.tag_id=t.id WHERE tl.lesson_id=l.id) AS tags,
    (SELECT json_agg(json_build_object('id',ti.id,'content',ti.content,'source_text',ti.source_text)) FROM thesis_ideas ti WHERE ti.lesson_id=l.id) AS ideas
    FROM lessons l JOIN courses c ON c.id=l.course_id
    LEFT JOIN lesson_contents lc ON lc.lesson_id=l.id LEFT JOIN lesson_studies s ON s.lesson_id=l.id
    WHERE ($2::text IS NULL OR l.course_id=$2) AND ($3::text IS NULL OR l.date >= $3) AND ($4::text IS NULL OR l.date <= $4)
    AND (l.title ILIKE $1 OR c.name ILIKE $1 OR lc.summary ILIKE $1 OR lc.transcript ILIKE $1 OR s.data ILIKE $1
      OR EXISTS (SELECT 1 FROM notes n WHERE n.lesson_id=l.id AND n.content ILIKE $1)
      OR EXISTS (SELECT 1 FROM tags t JOIN tag_on_lesson tl ON tl.tag_id=t.id WHERE tl.lesson_id=l.id AND t.name ILIKE $1)
      OR EXISTS (SELECT 1 FROM thesis_ideas ti WHERE ti.lesson_id=l.id AND (ti.content ILIKE $1 OR ti.source_text ILIKE $1)))
    ORDER BY l.date DESC,l.id`,
    [like, filter.courseId || null, filter.from || null, filter.to || null],
  );
  const results: SearchResult[] = [];
  const matches = (s: string | null | undefined) =>
    !!s?.toLowerCase().includes(q.toLowerCase());
  for (const row of rows) {
    const base = `/lessons/${row.id}`;
    const add = (
      text: string,
      type: string,
      tab: string,
      anchor = "",
      time?: string,
    ) => {
      if (matches(text))
        results.push({
          lessonId: row.id,
          lessonTitle: row.title,
          courseName: row.course_name,
          date: row.date,
          matchType: type,
          snippet: snippetAround(text, q),
          href: `${base}?tab=${tab}&q=${encodeURIComponent(q)}${anchor ? `#${anchor}` : ""}`,
          time,
        });
    };
    add(row.title, "標題", "overview");
    add(row.course_name, "課程", "overview");
    if (row.summary) add(row.summary, "來源摘要", "summary");
    if (row.notes) add(row.notes, "個人筆記", "notes");
    for (const tag of row.tags ?? []) add(tag, "標籤", "overview");
    for (const idea of row.ideas ?? [])
      add(
        `${idea.content}\n${idea.source_text ?? ""}`,
        "論文靈感",
        "overview",
        `idea-${idea.id}`,
      );
    const lines: TranscriptLine[] = row.transcript
      ? JSON.parse(row.transcript)
      : [];
    lines.forEach((line, i) =>
      add(line.text, "原始逐字稿", "transcript", `segment-${i}`, line.time),
    );
    const study: StudyData | null = row.study ? JSON.parse(row.study) : null;
    for (const item of study?.items ?? [])
      add(
        `${item.title} ${item.english}\n${item.text}\n${item.question}\n${item.answer}`,
        item.certainty === "pending"
          ? "學習筆記 · 待確認"
          : "學習筆記 · 已核對",
        "study",
        `study-${item.id}`,
        item.time,
      );
    for (const correction of study?.corrections ?? [])
      add(
        correction.text,
        correction.certainty === "pending"
          ? "校訂逐字稿 · 待確認"
          : "校訂逐字稿 · 已核對",
        "corrections",
        `correction-${correction.segment}`,
        lines[correction.segment]?.time,
      );
  }
  return results;
}
