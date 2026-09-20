import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";
import type {
  Lesson,
  LessonSource,
  LessonContent,
  LessonSummaryView,
  NormalizedLessonSource,
  ReviewStatusValue,
} from "@/lib/types";
import { getCourse } from "@/lib/repo/courses";
import { setTagsForLesson, getTagsForLesson } from "@/lib/repo/tags";

function rowToLesson(row: any): Lesson {
  return {
    id: row.id,
    courseId: row.course_id,
    week: row.week,
    date: row.date,
    title: row.title,
    duration: row.duration,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSource(row: any): LessonSource {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    provider: row.provider,
    sourceUrl: row.source_url,
    externalId: row.external_id,
    importStatus: row.import_status,
    importedAt: row.imported_at,
    rawData: row.raw_data,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToContent(row: any): LessonContent {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    summary: row.summary,
    transcript: row.transcript ? JSON.parse(row.transcript) : null,
    mindMap: row.mind_map ? JSON.parse(row.mind_map) : null,
    audioUrl: row.audio_url,
    updatedAt: row.updated_at,
  };
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const row = await queryOne(`SELECT * FROM lessons WHERE id = $1`, [id]);
  return row ? rowToLesson(row) : null;
}

export async function getLessonSource(lessonId: string): Promise<LessonSource | null> {
  const row = await queryOne(`SELECT * FROM lesson_sources WHERE lesson_id = $1`, [lessonId]);
  return row ? rowToSource(row) : null;
}

export async function getLessonContent(lessonId: string): Promise<LessonContent | null> {
  const row = await queryOne(`SELECT * FROM lesson_contents WHERE lesson_id = $1`, [lessonId]);
  return row ? rowToContent(row) : null;
}

export async function listLessons(filter?: { courseId?: string }): Promise<Lesson[]> {
  if (filter?.courseId) {
    const rows = await query(
      `SELECT * FROM lessons WHERE course_id = $1 ORDER BY date DESC`,
      [filter.courseId]
    );
    return rows.map(rowToLesson);
  }
  const rows = await query(`SELECT * FROM lessons ORDER BY date DESC`);
  return rows.map(rowToLesson);
}

async function ensureReviewStatus(lessonId: string) {
  const existing = await queryOne(`SELECT id FROM review_status WHERE lesson_id = $1`, [lessonId]);
  if (!existing) {
    await query(
      `INSERT INTO review_status (id, lesson_id, status, updated_at) VALUES ($1, $2, 'NOT_REVIEWED', $3)`,
      [nanoid(), lessonId, new Date().toISOString()]
    );
  }
}

/** Build the composite summary rows used by Dashboard / Timeline / Search */
export async function listLessonSummaries(filter?: {
  courseId?: string;
  limit?: number;
}): Promise<LessonSummaryView[]> {
  const lessons = filter?.courseId
    ? await query<any>(
        `SELECT l.*, c.name as course_name FROM lessons l
         JOIN courses c ON c.id = l.course_id
         WHERE l.course_id = $1 ORDER BY l.date DESC, l.week DESC`,
        [filter.courseId]
      )
    : await query<any>(
        `SELECT l.*, c.name as course_name FROM lessons l
         JOIN courses c ON c.id = l.course_id
         ORDER BY l.date DESC, l.week DESC
         ${filter?.limit ? `LIMIT ${Number(filter.limit)}` : ""}`
      );

  const results: LessonSummaryView[] = [];
  for (const row of lessons) {
    const tags = await getTagsForLesson(row.id);
    const noteRow = await queryOne<{ n: string }>(
      `SELECT COUNT(*) as n FROM notes WHERE lesson_id = $1`,
      [row.id]
    );
    const bookmarkRow = await queryOne(`SELECT id FROM bookmarks WHERE lesson_id = $1`, [row.id]);
    const reviewRow = await queryOne<{ status: string }>(
      `SELECT status FROM review_status WHERE lesson_id = $1`,
      [row.id]
    );
    const contentRow = await queryOne<{ summary: string | null }>(
      `SELECT summary FROM lesson_contents WHERE lesson_id = $1`,
      [row.id]
    );
    const sourceRow = await queryOne<{ import_status: string; provider: string }>(
      `SELECT import_status, provider FROM lesson_sources WHERE lesson_id = $1`,
      [row.id]
    );

    results.push({
      id: row.id,
      courseId: row.course_id,
      courseName: row.course_name,
      week: row.week,
      date: row.date,
      title: row.title,
      duration: row.duration,
      tags,
      hasNotes: Number(noteRow?.n ?? 0) > 0,
      isBookmarked: !!bookmarkRow,
      reviewStatus: (reviewRow?.status as ReviewStatusValue) ?? "NOT_REVIEWED",
      summaryPreview: contentRow?.summary ? String(contentRow.summary).slice(0, 140) : null,
      importStatus: (sourceRow?.import_status as any) ?? null,
      provider: (sourceRow?.provider as any) ?? null,
    });
  }
  return results;
}

export interface CreateLessonInput {
  courseId: string;
  week?: number | null;
  date: string; // ISO date
  title: string;
  duration?: string | null;
  tags?: string[];
}

export async function createLessonShell(input: CreateLessonInput): Promise<Lesson> {
  const course = await getCourse(input.courseId);
  if (!course) throw new Error("COURSE_NOT_FOUND");
  const id = nanoid();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO lessons (id, course_id, week, date, title, duration, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, input.courseId, input.week ?? null, input.date, input.title, input.duration ?? null, now, now]
  );
  await ensureReviewStatus(id);
  if (input.tags && input.tags.length) {
    await setTagsForLesson(id, input.tags);
  }
  return (await getLesson(id))!;
}

export async function upsertLessonSource(
  lessonId: string,
  normalized: NormalizedLessonSource
): Promise<LessonSource> {
  const now = new Date().toISOString();
  const existing = await getLessonSource(lessonId);
  const rawData = normalized.rawData ? JSON.stringify(normalized.rawData) : null;
  const importedAt =
    normalized.importStatus === "IMPORTED" || normalized.importStatus === "PARTIAL"
      ? now
      : existing?.importedAt ?? null;

  if (existing) {
    await query(
      `UPDATE lesson_sources SET provider = $1, source_url = $2, external_id = $3,
         import_status = $4, imported_at = $5, raw_data = $6, error_message = $7, updated_at = $8
       WHERE lesson_id = $9`,
      [
        normalized.provider,
        normalized.sourceUrl,
        normalized.externalId,
        normalized.importStatus,
        importedAt,
        rawData,
        normalized.errorMessage ?? null,
        now,
        lessonId,
      ]
    );
  } else {
    await query(
      `INSERT INTO lesson_sources
        (id, lesson_id, provider, source_url, external_id, import_status, imported_at, raw_data, error_message, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        nanoid(),
        lessonId,
        normalized.provider,
        normalized.sourceUrl,
        normalized.externalId,
        normalized.importStatus,
        importedAt,
        rawData,
        normalized.errorMessage ?? null,
        now,
        now,
      ]
    );
  }
  return (await getLessonSource(lessonId))!;
}

/**
 * Update the read-only imported content (summary / transcript / mindMap /
 * audioUrl). This NEVER touches Notes, Tags, Bookmarks, Review Status or
 * Thesis Ideas — those are personal data and must survive re-importing.
 */
export async function upsertLessonContent(
  lessonId: string,
  content: {
    summary?: string | null;
    transcript?: NormalizedLessonSource["transcript"];
    mindMap?: NormalizedLessonSource["mindMap"];
    audioUrl?: string | null;
  }
): Promise<LessonContent> {
  const now = new Date().toISOString();
  const existing = await getLessonContent(lessonId);
  const transcript = content.transcript ? JSON.stringify(content.transcript) : null;
  const mindMap = content.mindMap ? JSON.stringify(content.mindMap) : null;

  if (existing) {
    await query(
      `UPDATE lesson_contents SET summary = $1, transcript = $2, mind_map = $3, audio_url = $4, updated_at = $5
       WHERE lesson_id = $6`,
      [
        content.summary ?? existing.summary,
        transcript ?? (existing.transcript ? JSON.stringify(existing.transcript) : null),
        mindMap ?? (existing.mindMap ? JSON.stringify(existing.mindMap) : null),
        content.audioUrl ?? existing.audioUrl,
        now,
        lessonId,
      ]
    );
  } else {
    await query(
      `INSERT INTO lesson_contents (id, lesson_id, summary, transcript, mind_map, audio_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [nanoid(), lessonId, content.summary ?? null, transcript, mindMap, content.audioUrl ?? null, now]
    );
  }
  return (await getLessonContent(lessonId))!;
}

export async function updateLesson(
  id: string,
  input: Partial<{
    week: number | null;
    date: string;
    title: string;
    duration: string | null;
    courseId: string;
  }>
): Promise<Lesson | null> {
  const existing = await getLesson(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  await query(
    `UPDATE lessons SET course_id = $1, week = $2, date = $3, title = $4, duration = $5, updated_at = $6 WHERE id = $7`,
    [
      input.courseId ?? existing.courseId,
      input.week !== undefined ? input.week : existing.week,
      input.date ?? existing.date,
      input.title ?? existing.title,
      input.duration !== undefined ? input.duration : existing.duration,
      now,
      id,
    ]
  );
  return getLesson(id);
}

export async function deleteLesson(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM lessons WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}
