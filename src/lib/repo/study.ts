import { queryOne, transaction } from "@/lib/db";
import { emptyStudy, type StudyData, type StudyDocument } from "@/lib/study";
export async function getStudy(id: string): Promise<StudyDocument> {
  const row = await queryOne<{ data: string; version: number }>(
    "SELECT data, version FROM lesson_studies WHERE lesson_id=$1",
    [id],
  );
  return row
    ? { data: JSON.parse(row.data), version: row.version }
    : emptyStudy();
}
export async function saveStudy(id: string, data: StudyData, version: number) {
  return transaction(async (run) => {
    await run("SELECT pg_advisory_xact_lock(hashtext($1))", [`study:${id}`]);
    const rows = await run(
      "SELECT version FROM lesson_studies WHERE lesson_id=$1",
      [id],
    );
    if ((rows[0]?.version ?? 0) !== version) return null;
    const next = version + 1;
    await run(
      `INSERT INTO lesson_studies (lesson_id,data,version,updated_at) VALUES ($1,$2,$3,$4)
      ON CONFLICT (lesson_id) DO UPDATE SET data=EXCLUDED.data,version=EXCLUDED.version,updated_at=EXCLUDED.updated_at`,
      [id, JSON.stringify(data), next, new Date().toISOString()],
    );
    await run(
      "INSERT INTO study_revisions (lesson_id,version,data,created_at) VALUES ($1,$2,$3,$4)",
      [id, next, JSON.stringify(data), new Date().toISOString()],
    );
    return { data, version: next };
  });
}
