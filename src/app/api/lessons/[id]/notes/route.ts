import { NextResponse } from "next/server";
import { z } from "zod";
import { getLesson } from "@/lib/repo/lessons";
import { getOrCreateNoteForLesson, saveNoteContent } from "@/lib/repo/notes";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await getLesson(id))) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  const note = await getOrCreateNoteForLesson(id);
  return NextResponse.json({ note });
}

const schema = z.object({ content: z.string() });

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await getLesson(id))) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
  }
  const note = await saveNoteContent(id, parsed.data.content);
  return NextResponse.json({ note });
}
