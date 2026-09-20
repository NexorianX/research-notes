import { NextResponse } from "next/server";
import { z } from "zod";
import { getLesson, upsertLessonContent, upsertLessonSource, getLessonSource } from "@/lib/repo/lessons";

// Lets the user paste Summary / Transcript by hand when the one-time
// import came back PARTIAL/FAILED (or simply prefers to type it in).
// There is no automatic re-fetch — this manual path is the only way to
// fill a gap after the initial import. Marks the source provider as
// "manual" with importStatus "MANUAL" if there was no source yet,
// otherwise keeps the existing link but records that content is
// manually maintained going forward.
const schema = z.object({
  summary: z.string().optional(),
  transcript: z.string().optional(), // plain text; stored as a single transcript line
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
    return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
  }

  const content = await upsertLessonContent(id, {
    summary: parsed.data.summary,
    transcript: parsed.data.transcript
      ? [{ text: parsed.data.transcript }]
      : undefined,
  });

  const existingSource = await getLessonSource(id);
  if (!existingSource) {
    await upsertLessonSource(id, {
      provider: "manual",
      sourceUrl: "",
      externalId: "",
      importStatus: "MANUAL",
    });
  }

  return NextResponse.json({ content });
}
