import { NextResponse } from "next/server";
import { z } from "zod";
import { getLesson } from "@/lib/repo/lessons";
import { setReviewStatus } from "@/lib/repo/review";

const schema = z.object({
  status: z.enum(["NOT_REVIEWED", "REVIEWED", "NEED_REVIEW", "EXAM_FOCUS"]),
});

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
  const status = await setReviewStatus(id, parsed.data.status);
  return NextResponse.json({ status });
}
