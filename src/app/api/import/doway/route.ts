import { NextResponse } from "next/server";
import { z } from "zod";
import { getCourse } from "@/lib/repo/courses";
import {
  createLessonShell,
  upsertLessonContent,
  upsertLessonSource,
} from "@/lib/repo/lessons";
import { detectProvider } from "@/services/importers";

const bodySchema = z.object({
  url: z.string().min(1, "請貼上分享網址"),
  courseId: z.string().min(1, "請選擇課程"),
  date: z.string().min(1, "請選擇上課日期"),
  week: z.coerce.number().int().optional().nullable(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "資料格式錯誤" },
      { status: 400 }
    );
  }
  const { url, courseId, date, week, title, tags } = parsed.data;

  const course = await getCourse(courseId);
  if (!course) {
    return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  }

  const importer = detectProvider(url);
  if (!importer || importer.provider !== "doway") {
    return NextResponse.json(
      { error: "這不是有效的分享網址" },
      { status: 400 }
    );
  }

  // fetchAndNormalize never throws for ordinary failure — Strategy C
  // always returns a usable (if empty) NormalizedLessonSource so the
  // Lesson can still be created.
  const normalized = await importer.fetchAndNormalize(url);

  const resolvedTitle =
    (title && title.trim()) ||
    (normalized.title && normalized.title.trim()) ||
    `${course.name} ${date}`;

  const lesson = await createLessonShell({
    courseId,
    week: week ?? null,
    date,
    title: resolvedTitle,
    tags,
  });

  const source = await upsertLessonSource(lesson.id, normalized);

  let content = null;
  if (normalized.summary || normalized.transcript || normalized.mindMap || normalized.audioUrl) {
    content = await upsertLessonContent(lesson.id, {
      summary: normalized.summary,
      transcript: normalized.transcript,
      mindMap: normalized.mindMap,
      audioUrl: normalized.audioUrl,
    });
  }

  const progress = {
    shareId: normalized.externalId,
    summary: !!normalized.summary,
    transcript: !!normalized.transcript,
    mindMap: !!normalized.mindMap,
  };

  return NextResponse.json(
    {
      lesson,
      source,
      content,
      progress,
      message:
        source.importStatus === "IMPORTED"
          ? `課程已加入「${course.name}」`
          : source.importStatus === "PARTIAL"
          ? `課程已加入「${course.name}」，部分內容請手動貼上或上傳補齊`
          : `課程已加入「${course.name}」。${normalized.errorMessage ?? "內容尚未匯入，請手動貼上或上傳。"}`,
    },
    { status: 201 }
  );
}
