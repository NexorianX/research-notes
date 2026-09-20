import { NextResponse } from "next/server";
import { z } from "zod";
import { createCourse, listCourses } from "@/lib/repo/courses";

export async function GET() {
  return NextResponse.json({ courses: await listCourses() });
}

const createSchema = z.object({
  name: z.string().min(1, "課程名稱不可為空"),
  description: z.string().optional().nullable(),
  semester: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "資料格式錯誤" },
      { status: 400 }
    );
  }
  const course = await createCourse(parsed.data);
  return NextResponse.json({ course }, { status: 201 });
}
