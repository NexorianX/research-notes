import { queryOne } from "@/lib/db";
export async function getGlobalStats() {
  const row = await queryOne(`SELECT
    (SELECT COUNT(*) FROM courses) AS courses,
    (SELECT COUNT(*) FROM lessons) AS lessons,
    (SELECT COUNT(*) FROM notes WHERE TRIM(content) != '') AS notes,
    (SELECT COUNT(*) FROM thesis_ideas) AS ideas`);
  return {
    courseCount: Number(row?.courses ?? 0),
    lessonCount: Number(row?.lessons ?? 0),
    noteCount: Number(row?.notes ?? 0),
    thesisCount: Number(row?.ideas ?? 0),
  };
}
