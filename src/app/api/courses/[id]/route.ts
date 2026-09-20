import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteCourse, getCourse, updateCourse } from "@/lib/repo/courses";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  semester: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  return NextResponse.json({ course });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
  }
  const course = await updateCourse(id, parsed.data);
  if (!course) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  return NextResponse.json({ course });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteCourse(id);
  if (!ok) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
