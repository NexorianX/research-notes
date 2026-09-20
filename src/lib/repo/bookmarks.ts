import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";

export async function isBookmarked(lessonId: string): Promise<boolean> {
  const row = await queryOne(`SELECT id FROM bookmarks WHERE lesson_id = $1`, [lessonId]);
  return !!row;
}

export async function toggleBookmark(lessonId: string): Promise<boolean> {
  const existing = await queryOne(`SELECT id FROM bookmarks WHERE lesson_id = $1`, [lessonId]);
  if (existing) {
    await query(`DELETE FROM bookmarks WHERE lesson_id = $1`, [lessonId]);
    return false;
  }
  await query(`INSERT INTO bookmarks (id, lesson_id, created_at) VALUES ($1, $2, $3)`, [
    nanoid(),
    lessonId,
    new Date().toISOString(),
  ]);
  return true;
}

export async function listBookmarkedLessons() {
  const rows = await query<any>(
    `SELECT l.*, c.name as course_name, b.created_at as bookmarked_at
     FROM bookmarks b
     JOIN lessons l ON l.id = b.lesson_id
     JOIN courses c ON c.id = l.course_id
     ORDER BY b.created_at DESC`
  );
  return rows.map((r) => ({
    lessonId: r.id,
    courseId: r.course_id,
    courseName: r.course_name,
    title: r.title,
    date: r.date,
    week: r.week,
    bookmarkedAt: r.bookmarked_at,
  }));
}
