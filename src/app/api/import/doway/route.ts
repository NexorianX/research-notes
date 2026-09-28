import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getCourse } from "@/lib/repo/courses";
import { getLesson, getLessonContent, getLessonSource, updateLesson, upsertLessonContent, upsertLessonSource } from "@/lib/repo/lessons";
import { setTagsForLesson } from "@/lib/repo/tags";
import { transaction } from "@/lib/db";
import { detectProvider } from "@/services/importers";

export const maxDuration = 60;
const bodySchema = z.object({
  url: z.string().trim().min(1, "請貼上課程錄音分享網址"),
  courseId: z.string().min(1, "請選擇課程"),
  date: z.iso.date(),
  week: z.number().int().positive().optional().nullable(),
  title: z.string().max(500).optional(),
  tags: z.array(z.string().max(100)).max(30).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "資料格式錯誤" }, { status: 400 });
  const { url, courseId, date, week, title, tags } = parsed.data;
  const importer = detectProvider(url);
  if (!importer || importer.provider !== "doway") return NextResponse.json({ error: "這不是有效的分享網址" }, { status: 400 });
  const course = await getCourse(courseId);
  if (!course) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  const externalId = importer.extractId(url)!;
  const sourceUrl = `https://www.dowayai.com/share/${externalId}`;
  // Reserve the lesson before touching the external source. Concurrent and later
  // submissions return the saved lesson, including failed imports, without fetching.
  const reservation = await transaction(async (run) => {
    await run("SELECT pg_advisory_xact_lock(hashtext($1))", [`${courseId}:${externalId}`]);
    const existing = await run(`SELECT l.id, s.import_status,
      EXISTS (SELECT 1 FROM lesson_contents c WHERE c.lesson_id = l.id AND
        (NULLIF(c.summary, '') IS NOT NULL OR NULLIF(c.transcript, '') IS NOT NULL OR NULLIF(c.mind_map, '') IS NOT NULL OR NULLIF(c.audio_url, '') IS NOT NULL)) AS has_content
      FROM lessons l JOIN lesson_sources s ON s.lesson_id = l.id
      WHERE l.course_id = $1 AND s.provider = 'doway' AND s.external_id = $2 LIMIT 1`, [courseId, externalId]);
    if (existing[0]) {
      const saved = existing[0];
      const id = String(saved.id);
      // Only seed placeholders are eligible for their FIRST extraction. A real
      // FAILED/PARTIAL/IMPORTED attempt never becomes eligible again.
      if (saved.import_status !== "PENDING" || saved.has_content) return { id, existing: true };
      const now = new Date().toISOString();
      await run(`UPDATE lesson_sources SET import_status = 'FAILED', raw_data = $1,
        error_message = $2, updated_at = $3 WHERE lesson_id = $4`,
        [JSON.stringify({ attemptStartedAt: now }), "首次匯入尚未完成；若流程已結束，請手動補件。", now, id]);
      await run(`UPDATE lessons SET date = $1, week = COALESCE($2, week),
        title = COALESCE(NULLIF($3, ''), title), updated_at = $4 WHERE id = $5`,
        [date, week ?? null, title?.trim() || "", now, id]);
      return { id, existing: false };
    }
    const id = nanoid();
    const now = new Date().toISOString();
    await run(`INSERT INTO lessons (id, course_id, week, date, title, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $6)`, [id, courseId, week ?? null, date, title?.trim() || `${course.name} ${date}`, now]);
    // Failed-until-complete ensures a terminated function never leaves a permanent loading state.
    await run(`INSERT INTO lesson_sources (id, lesson_id, provider, source_url, external_id, import_status, raw_data, error_message, created_at, updated_at)
      VALUES ($1, $2, 'doway', $3, $4, 'FAILED', $5, $6, $7, $7)`,
      [nanoid(), id, sourceUrl, externalId, JSON.stringify({ attemptStartedAt: now }), "內容尚未成功轉換；若匯入已結束，請手動補件。", now]);
    await run(`INSERT INTO review_status (id, lesson_id, status, updated_at) VALUES ($1, $2, 'NOT_REVIEWED', $3)`, [nanoid(), id, now]);
    return { id, existing: false };
  });
  if (reservation.existing) {
    const content = await getLessonContent(reservation.id);
    const source = await getLessonSource(reservation.id);
    return NextResponse.json({ lesson: await getLesson(reservation.id), source, content, reused: true,
      progress: { summary: !!content?.summary, transcript: !!content?.transcript?.length, mindMap: !!content?.mindMap },
      message: source?.importStatus === "IMPORTED"
        ? "此課堂已匯入，直接開啟既有內容。"
        : "此課堂已執行過匯入，缺漏內容請手動補件；不會重複擷取。" });
  }
  if (tags?.length) await setTagsForLesson(reservation.id, tags);
  let normalized;
  try { normalized = await importer.fetchAndNormalize(sourceUrl); }
  catch { normalized = { provider: "doway" as const, sourceUrl, externalId, importStatus: "FAILED" as const, errorMessage: "內容無法自動讀取，請手動補件。" }; }
  await updateLesson(reservation.id, {
    ...(!title?.trim() && normalized.title ? { title: normalized.title } : {}),
    ...(normalized.duration ? { duration: normalized.duration } : {}),
  });
  const content = await upsertLessonContent(reservation.id, normalized);
  const source = await upsertLessonSource(reservation.id, normalized);
  return NextResponse.json({ lesson: await getLesson(reservation.id), source, content,
    progress: { summary: !!content.summary, transcript: !!content.transcript?.length, mindMap: !!content.mindMap },
    message: source.importStatus === "IMPORTED" ? `課程已加入「${course.name}」` : `課程已加入「${course.name}」，缺漏內容請手動補件。`,
  }, { status: 201 });
}
