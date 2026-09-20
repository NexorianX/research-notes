import { listLessonSummaries } from "@/lib/repo/lessons";
import { LessonRow } from "@/components/lesson-row";
import { formatMonthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SemesterTimelinePage() {
  const lessons = await listLessonSummaries();

  const groups = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = formatMonthLabel(l.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        學期時間軸
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        所有課程依日期排序（最新在最上方）
      </p>

      <div className="mt-6 space-y-8">
        {Array.from(groups.entries()).map(([month, items]) => (
          <div key={month}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-500">{month}</h2>
            <div className="space-y-2 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
              {items.map((l) => (
                <LessonRow key={l.id} lesson={l} />
              ))}
            </div>
          </div>
        ))}
        {lessons.length === 0 && (
          <p className="text-sm text-neutral-400">尚無課程紀錄，請先匯入課程錄音。</p>
        )}
      </div>
    </div>
  );
}
