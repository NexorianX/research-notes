import Link from "next/link";
import { listBookmarkedLessons } from "@/lib/repo/bookmarks";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const bookmarks = await listBookmarkedLessons();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Bookmarks</h1>
      <p className="mt-1 text-sm text-neutral-500">已收藏的課程</p>

      <div className="mt-6 space-y-2">
        {bookmarks.map((b) => (
          <Link
            key={b.lessonId}
            href={`/lessons/${b.lessonId}`}
            className="block rounded-md border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span>{b.courseName}</span>
              {b.week != null && <span>· Week {b.week}</span>}
              <span>· {formatDate(b.date)}</span>
            </div>
            <h3 className="mt-1 text-sm font-medium">{b.title}</h3>
          </Link>
        ))}
        {bookmarks.length === 0 && (
          <p className="text-sm text-neutral-400">尚無收藏的課程。</p>
        )}
      </div>
    </div>
  );
}
