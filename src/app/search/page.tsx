import Link from "next/link";
import { globalSearch } from "@/lib/repo/search";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const MATCH_LABEL: Record<string, string> = {
  title: "標題",
  summary: "Summary",
  transcript: "Transcript",
  notes: "My Notes",
  tag: "Tag",
  thesis: "Thesis Idea",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? "";
  const results = query ? await globalSearch(query) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        Global Search
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        搜尋 Course / Lesson / Summary / Transcript / Notes / Tags / Thesis Ideas
      </p>

      <form className="mt-4" action="/search">
        <Input name="q" defaultValue={query} placeholder="Network Effect" autoFocus />
      </form>

      <div className="mt-6 space-y-2">
        {results.map((r, i) => (
          <Link
            key={i}
            href={`/lessons/${r.lessonId}`}
            className="block rounded-md border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span>{r.courseName}</span>
              {r.week != null && <span>· Week {r.week}</span>}
              <span>· {formatDate(r.date)}</span>
              <Badge variant="outline">{MATCH_LABEL[r.matchType] ?? r.matchType}</Badge>
            </div>
            <div className="mt-1 text-sm font-medium">{r.lessonTitle}</div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{r.snippet}</p>
          </Link>
        ))}
        {query && results.length === 0 && (
          <p className="text-sm text-neutral-400">找不到符合「{query}」的結果。</p>
        )}
      </div>
    </div>
  );
}
