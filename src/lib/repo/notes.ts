import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";
import type { Note } from "@/lib/types";

function rowToNote(row: any): Note {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Each lesson has exactly one freeform Notes document (auto-saved). */
export async function getOrCreateNoteForLesson(lessonId: string): Promise<Note> {
  const existing = await queryOne(
    `SELECT * FROM notes WHERE lesson_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [lessonId]
  );
  if (existing) return rowToNote(existing);
  const id = nanoid();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO notes (id, lesson_id, content, created_at, updated_at) VALUES ($1, $2, '', $3, $4)`,
    [id, lessonId, now, now]
  );
  return rowToNote((await queryOne(`SELECT * FROM notes WHERE id = $1`, [id]))!);
}

export async function saveNoteContent(lessonId: string, content: string): Promise<Note> {
  const note = await getOrCreateNoteForLesson(lessonId);
  const now = new Date().toISOString();
  await query(`UPDATE notes SET content = $1, updated_at = $2 WHERE id = $3`, [
    content,
    now,
    note.id,
  ]);
  return rowToNote((await queryOne(`SELECT * FROM notes WHERE id = $1`, [note.id]))!);
}

export async function listAllNotesWithLesson() {
  const rows = await query<any>(
    `SELECT n.*, l.title as lesson_title, l.date as lesson_date, c.name as course_name, l.id as lid, c.id as cid
     FROM notes n
     JOIN lessons l ON l.id = n.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE TRIM(n.content) != ''
     ORDER BY n.updated_at DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    lessonId: r.lid,
    lessonTitle: r.lesson_title,
    lessonDate: r.lesson_date,
    courseId: r.cid,
    courseName: r.course_name,
    content: r.content,
    updatedAt: r.updated_at,
  }));
}
