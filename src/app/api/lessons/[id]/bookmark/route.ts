import { NextResponse } from "next/server";
import { getLesson } from "@/lib/repo/lessons";
import { toggleBookmark } from "@/lib/repo/bookmarks";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await getLesson(id))) return NextResponse.json({ error: "找不到課程" }, { status: 404 });
  const bookmarked = await toggleBookmark(id);
  return NextResponse.json({ bookmarked });
}
