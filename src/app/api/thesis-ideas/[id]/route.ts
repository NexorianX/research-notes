import { NextResponse } from "next/server";
import { deleteThesisIdea } from "@/lib/repo/thesis";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteThesisIdea(id);
  if (!ok) return NextResponse.json({ error: "找不到論文靈感" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
