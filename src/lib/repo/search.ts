import { query } from "@/lib/db";

export interface SearchResult {
  lessonId: string;
  courseId: string;
  courseName: string;
  lessonTitle: string;
  week: number | null;
  date: string;
  matchType: "summary" | "transcript" | "notes" | "tag" | "thesis" | "title";
  snippet: string;
}

function snippetAround(text: string, q: string, radius = 60): string {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export async function globalSearch(queryStr: string): Promise<SearchResult[]> {
  const q = queryStr.trim();
  if (!q) return [];
  const like = `%${q}%`;
  const results: SearchResult[] = [];

  const titleRows = await query<any>(
    `SELECT l.id as lid, l.title, l.week, l.date, c.id as cid, c.name as cname
     FROM lessons l JOIN courses c ON c.id = l.course_id
     WHERE l.title ILIKE $1`,
    [like]
  );
  for (const r of titleRows) {
    results.push({
      lessonId: r.lid,
      courseId: r.cid,
      courseName: r.cname,
      lessonTitle: r.title,
      week: r.week,
      date: r.date,
      matchType: "title",
      snippet: r.title,
    });
  }

  const summaryRows = await query<any>(
    `SELECT lc.summary, l.id as lid, l.title, l.week, l.date, c.id as cid, c.name as cname
     FROM lesson_contents lc
     JOIN lessons l ON l.id = lc.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE lc.summary ILIKE $1`,
    [like]
  );
  for (const r of summaryRows) {
    results.push({
      lessonId: r.lid,
      courseId: r.cid,
      courseName: r.cname,
      lessonTitle: r.title,
      week: r.week,
      date: r.date,
      matchType: "summary",
      snippet: snippetAround(r.summary ?? "", q),
    });
  }

  const transcriptRows = await query<any>(
    `SELECT lc.transcript, l.id as lid, l.title, l.week, l.date, c.id as cid, c.name as cname
     FROM lesson_contents lc
     JOIN lessons l ON l.id = lc.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE lc.transcript ILIKE $1`,
    [like]
  );
  for (const r of transcriptRows) {
    results.push({
      lessonId: r.lid,
      courseId: r.cid,
      courseName: r.cname,
      lessonTitle: r.title,
      week: r.week,
      date: r.date,
      matchType: "transcript",
      snippet: snippetAround(r.transcript ?? "", q),
    });
  }

  const noteRows = await query<any>(
    `SELECT n.content, l.id as lid, l.title, l.week, l.date, c.id as cid, c.name as cname
     FROM notes n
     JOIN lessons l ON l.id = n.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE n.content ILIKE $1`,
    [like]
  );
  for (const r of noteRows) {
    results.push({
      lessonId: r.lid,
      courseId: r.cid,
      courseName: r.cname,
      lessonTitle: r.title,
      week: r.week,
      date: r.date,
      matchType: "notes",
      snippet: snippetAround(r.content ?? "", q),
    });
  }

  const tagRows = await query<any>(
    `SELECT t.name, l.id as lid, l.title, l.week, l.date, c.id as cid, c.name as cname
     FROM tags t
     JOIN tag_on_lesson tol ON tol.tag_id = t.id
     JOIN lessons l ON l.id = tol.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE t.name ILIKE $1`,
    [like]
  );
  for (const r of tagRows) {
    results.push({
      lessonId: r.lid,
      courseId: r.cid,
      courseName: r.cname,
      lessonTitle: r.title,
      week: r.week,
      date: r.date,
      matchType: "tag",
      snippet: `#${r.name}`,
    });
  }

  const thesisRows = await query<any>(
    `SELECT ti.content, ti.source_text, l.id as lid, l.title, l.week, l.date, c.id as cid, c.name as cname
     FROM thesis_ideas ti
     JOIN lessons l ON l.id = ti.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE ti.content ILIKE $1 OR ti.source_text ILIKE $1`,
    [like]
  );
  for (const r of thesisRows) {
    results.push({
      lessonId: r.lid,
      courseId: r.cid,
      courseName: r.cname,
      lessonTitle: r.title,
      week: r.week,
      date: r.date,
      matchType: "thesis",
      snippet: snippetAround(r.content ?? r.source_text ?? "", q),
    });
  }

  return results;
}
