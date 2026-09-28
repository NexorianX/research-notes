import { z } from "zod";
import { nanoid } from "nanoid";
import { transaction } from "@/lib/db";
const schema = z.object({
  summary: z.string().max(200000).optional(),
  transcript: z.string().max(1000000).optional(),
});
// Fill missing source fields only. Corrections belong in lesson_studies.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "資料格式錯誤" }, { status: 400 });
  const result = await transaction(async (run) => {
    const lesson = await run("SELECT id FROM lessons WHERE id=$1 FOR UPDATE", [
      id,
    ]);
    if (!lesson.length) return { error: "找不到課程", status: 404 };
    const rows = await run(
      "SELECT * FROM lesson_contents WHERE lesson_id=$1 FOR UPDATE",
      [id],
    );
    const current = rows[0];
    const hasTranscript =
      !!current?.transcript && JSON.parse(current.transcript).length > 0;
    if (
      (current?.summary?.trim() &&
        parsed.data.summary?.trim() &&
        parsed.data.summary !== current.summary) ||
      (hasTranscript && parsed.data.transcript?.trim())
    )
      return {
        error: "原始內容已保存，請至「逐字稿校訂」或「學習筆記」另行整理。",
        status: 409,
      };
    const summary = current?.summary?.trim()
      ? current.summary
      : parsed.data.summary?.trim() || null;
    const transcript = hasTranscript
      ? current.transcript
      : parsed.data.transcript?.trim()
        ? JSON.stringify([{ text: parsed.data.transcript.trim() }])
        : null;
    const now = new Date().toISOString();
    await run(
      `INSERT INTO lesson_contents(id,lesson_id,summary,transcript,updated_at) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT(lesson_id) DO UPDATE SET summary=EXCLUDED.summary,transcript=EXCLUDED.transcript,updated_at=EXCLUDED.updated_at`,
      [nanoid(), id, summary, transcript, now],
    );
    await run(
      `INSERT INTO lesson_sources(id,lesson_id,provider,import_status,created_at,updated_at) VALUES ($1,$2,'manual','MANUAL',$3,$3) ON CONFLICT(lesson_id) DO NOTHING`,
      [nanoid(), id, now],
    );
    return { status: 200 };
  });
  return Response.json(
    result.error ? { error: result.error } : { saved: true },
    { status: result.status },
  );
}
