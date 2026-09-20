import { queryOne } from "@/lib/db";

export async function getGlobalStats() {
  const courseCount = (await queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM courses`))!.n;
  const lessonCount = (await queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM lessons`))!.n;
  const noteCount = (
    await queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM notes WHERE TRIM(content) != ''`)
  )!.n;
  const thesisCount = (
    await queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM thesis_ideas`)
  )!.n;
  return {
    courseCount: Number(courseCount),
    lessonCount: Number(lessonCount),
    noteCount: Number(noteCount),
    thesisCount: Number(thesisCount),
  };
}
