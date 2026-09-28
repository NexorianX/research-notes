import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";
import type { Course, CourseCardView } from "@/lib/types";

function rowToCourse(row: any): Course {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    semester: row.semester,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCourses(): Promise<Course[]> {
  const rows = await query(`SELECT * FROM courses ORDER BY created_at ASC`);
  return rows.map(rowToCourse);
}

export async function getCourse(id: string): Promise<Course | null> {
  const row = await queryOne(`SELECT * FROM courses WHERE id = $1`, [id]);
  return row ? rowToCourse(row) : null;
}

export async function createCourse(input: {
  name: string;
  description?: string | null;
  semester?: string | null;
  color?: string | null;
}): Promise<Course> {
  const id = nanoid();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO courses (id, name, description, semester, color, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.name,
      input.description ?? null,
      input.semester ?? null,
      input.color ?? null,
      now,
      now,
    ],
  );
  return (await getCourse(id))!;
}

export async function updateCourse(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    semester: string | null;
    color: string | null;
  }>,
): Promise<Course | null> {
  const existing = await getCourse(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  await query(
    `UPDATE courses SET name = $1, description = $2, semester = $3, color = $4, updated_at = $5 WHERE id = $6`,
    [
      input.name ?? existing.name,
      input.description !== undefined
        ? input.description
        : existing.description,
      input.semester !== undefined ? input.semester : existing.semester,
      input.color !== undefined ? input.color : existing.color,
      now,
      id,
    ],
  );
  return getCourse(id);
}

export async function deleteCourse(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM courses WHERE id = $1 RETURNING id`, [
    id,
  ]);
  return rows.length > 0;
}

export async function listCourseCards(): Promise<CourseCardView[]> {
  const rows = await query(`SELECT c.*,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lesson_count,
    (SELECT COUNT(*) FROM notes n JOIN lessons l ON l.id=n.lesson_id WHERE l.course_id=c.id AND TRIM(n.content) != '') AS note_count,
    (SELECT COUNT(*) FROM review_status rs JOIN lessons l ON l.id=rs.lesson_id WHERE l.course_id=c.id AND rs.status='NEED_REVIEW') AS need_review_count,
    (SELECT MAX(l.date) FROM lessons l WHERE l.course_id=c.id) AS last_lesson_date
    FROM courses c ORDER BY c.created_at ASC`);
  return rows.map((row) => ({
    ...rowToCourse(row),
    lessonCount: Number(row.lesson_count),
    noteCount: Number(row.note_count),
    needReviewCount: Number(row.need_review_count),
    lastLessonDate: row.last_lesson_date ?? null,
  }));
}
