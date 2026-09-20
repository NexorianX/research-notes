import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";
import type { ThesisIdea } from "@/lib/types";
import { getTagsForThesisIdea, setTagsForThesisIdea } from "@/lib/repo/tags";

async function rowToThesis(row: any): Promise<ThesisIdea> {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    sourceType: row.source_type,
    sourceText: row.source_text,
    content: row.content,
    createdAt: row.created_at,
    tags: await getTagsForThesisIdea(row.id),
  };
}

export async function createThesisIdea(input: {
  lessonId: string;
  sourceType: string;
  sourceText?: string | null;
  content: string;
  tags?: string[];
}): Promise<ThesisIdea> {
  const id = nanoid();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO thesis_ideas (id, lesson_id, source_type, source_text, content, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, input.lessonId, input.sourceType, input.sourceText ?? null, input.content, now]
  );
  if (input.tags?.length) await setTagsForThesisIdea(id, input.tags);
  return rowToThesis((await queryOne(`SELECT * FROM thesis_ideas WHERE id = $1`, [id]))!);
}

export async function deleteThesisIdea(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM thesis_ideas WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function listThesisIdeas() {
  const rows = await query<any>(
    `SELECT ti.*, l.title as lesson_title, l.date as lesson_date, c.name as course_name, c.id as course_id
     FROM thesis_ideas ti
     JOIN lessons l ON l.id = ti.lesson_id
     JOIN courses c ON c.id = l.course_id
     ORDER BY ti.created_at DESC`
  );
  const results = [];
  for (const r of rows) {
    results.push({
      ...(await rowToThesis(r)),
      lessonTitle: r.lesson_title,
      lessonDate: r.lesson_date,
      courseName: r.course_name,
      courseId: r.course_id,
    });
  }
  return results;
}

export async function listThesisIdeasForLesson(lessonId: string): Promise<ThesisIdea[]> {
  const rows = await query<any>(
    `SELECT * FROM thesis_ideas WHERE lesson_id = $1 ORDER BY created_at DESC`,
    [lessonId]
  );
  const results: ThesisIdea[] = [];
  for (const r of rows) results.push(await rowToThesis(r));
  return results;
}
