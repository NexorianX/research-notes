import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteLesson, getLesson, updateLesson } from "@/lib/repo/lessons";
import { setTagsForLesson, getTagsForLesson } from "@/lib/repo/tags";

const schema = z.object({
  week: z.coerce.number().int().nullable().optional(),
  date: z.string().optional(),
  title: z.string().min(1).optional(),
  duration: z.string().nullable().optional(),
  courseId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
  }
  const { tags, ...lessonFields } = parsed.data;
  const lesson = await updateLesson(id, lessonFields);
  if (!lesson) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  if (tags) await setTagsForLesson(id, tags);
  return NextResponse.json({ lesson, tags: await getTagsForLesson(id) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await getLesson(id))) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  await deleteLesson(id);
  return NextResponse.json({ ok: true });
}
