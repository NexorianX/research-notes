import Link from "next/link";
import { listCourseCards } from "@/lib/repo/courses";
import { listLessonSummaries } from "@/lib/repo/lessons";
import { getGlobalStats } from "@/lib/repo/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonRow } from "@/components/lesson-row";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getGlobalStats();
  const courses = await listCourseCards();
  const recent = await listLessonSummaries({ limit: 6 });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        研究所課程筆記
      </h1>
      <p className="mt-1 text-sm text-neutral-500">本學期</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Courses" value={stats.courseCount} />
        <StatCard label="Lessons" value={stats.lessonCount} />
        <StatCard label="Notes" value={stats.noteCount} />
        <StatCard label="Thesis Ideas" value={stats.thesisCount} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          課程
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`}>
              <Card className="h-full transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <div>{c.lessonCount} Lessons</div>
                  <div>
                    最近上課日期：
                    {c.lastLessonDate ? formatDate(c.lastLessonDate) : "尚無課程"}
                  </div>
                  <div>{c.noteCount} Notes</div>
                  <div>待複習：{c.needReviewCount}</div>
                  <div>最後更新：{formatDate(c.updatedAt)}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {courses.length === 0 && (
            <p className="text-sm text-neutral-400">
              尚無課程，請至「設定」新增課程。
            </p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            最近課程
          </h2>
          <Link href="/timeline" className="text-xs text-neutral-400 hover:underline">
            查看學期時間軸 →
          </Link>
        </div>
        <div className="space-y-2">
          {recent.map((l) => (
            <LessonRow key={l.id} lesson={l} />
          ))}
          {recent.length === 0 && (
            <p className="text-sm text-neutral-400">尚無課程紀錄。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
