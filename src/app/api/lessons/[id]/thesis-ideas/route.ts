import { NextResponse } from "next/server";
import { z } from "zod";
import { getLesson } from "@/lib/repo/lessons";
import { createThesisIdea, listThesisIdeasForLesson } from "@/lib/repo/thesis";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await getLesson(id))) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  return NextResponse.json({ ideas: await listThesisIdeasForLesson(id) });
}

const schema = z.object({
  sourceType: z.string().default("manual"),
  sourceText: z.string().optional().nullable(),
  content: z.string().min(1, "請輸入你的想法"),
  tags: z.array(z.string()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await getLesson(id))) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "資料格式錯誤" },
      { status: 400 }
    );
  }
  const idea = await createThesisIdea({ lessonId: id, ...parsed.data });
  return NextResponse.json({ idea }, { status: 201 });
}
