import Link from "next/link";
import { globalSearch } from "@/lib/repo/search";
import { listCourses } from "@/lib/repo/courses";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
export const dynamic = "force-dynamic";
function Highlight({ text, q }: { text: string; q: string }) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-neutral-900">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    course?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const p = await searchParams;
  const q = (p.q ?? "").trim().slice(0, 200);
  const from = z.iso.date().safeParse(p.from).success ? p.from : undefined;
  const to = z.iso.date().safeParse(p.to).success ? p.to : undefined;
  const invalid = !!(
    (p.from && !from) ||
    (p.to && !to) ||
    (from && to && from > to)
  );
  const courses = await listCourses();
  const results =
    q && !invalid
      ? await globalSearch(q, { courseId: p.course, from, to })
      : [];
  const totalPages = Math.max(1, Math.ceil(results.length / 40));
  const page = Math.min(
    totalPages,
    Math.max(1, Number.parseInt(p.page ?? "1") || 1),
  );
  const link = (next: number) =>
    `/search?${new URLSearchParams({ q, course: p.course ?? "", from: from ?? "", to: to ?? "", page: String(next) })}`;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold">搜尋課程筆記</h1>
      <p className="mt-2 text-sm text-neutral-500">
        搜尋概念、名詞、校訂筆記與逐字稿，點選結果可回到命中內容。
      </p>
      <form className="mt-4 space-y-3" action="/search">
        <label className="block text-sm">
          關鍵字
          <Input
            name="q"
            maxLength={200}
            defaultValue={q}
            placeholder="例如：敏捷、Scrum、需求"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            課程
            <select
              name="course"
              defaultValue={p.course ?? ""}
              className="w-full rounded-md border bg-transparent p-2"
            >
              <option value="">全部課程</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            開始日期
            <Input name="from" type="date" defaultValue={from} />
          </label>
          <label className="text-sm">
            結束日期
            <Input name="to" type="date" defaultValue={to} />
          </label>
        </div>
        <Button>搜尋</Button>{" "}
        <Link className="text-sm underline" href="/search">
          清除條件
        </Link>
      </form>
      {invalid && (
        <p role="alert" className="mt-4 text-red-600">
          請檢查日期格式，結束日期不可早於開始日期。
        </p>
      )}
      {q && !invalid && (
        <p className="mt-5 text-sm">
          找到 {results.length} 筆結果 · 第 {page} / {totalPages} 頁
        </p>
      )}
      <div className="mt-4 space-y-3">
        {results.slice((page - 1) * 40, page * 40).map((r, i) => (
          <Link
            key={`${r.href}-${i}`}
            href={r.href}
            className="block rounded-lg border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <p className="text-xs text-neutral-500">
              {r.courseName} · {formatDate(r.date)} · {r.matchType}
              {r.time && ` · ${r.time}`}
            </p>
            <h2 className="mt-1 font-medium">{r.lessonTitle}</h2>
            <p className="mt-2 text-sm whitespace-pre-wrap">
              <Highlight text={r.snippet} q={q} />
            </p>
          </Link>
        ))}
        {q && !invalid && !results.length && (
          <p>找不到符合的內容，請調整關鍵字或篩選條件。</p>
        )}
      </div>
      <nav className="mt-5 flex justify-between" aria-label="搜尋結果分頁">
        {page > 1 ? <Link href={link(page - 1)}>上一頁</Link> : <span />}
        {page < totalPages && <Link href={link(page + 1)}>下一頁</Link>}
      </nav>
    </div>
  );
}
