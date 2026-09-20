import Link from "next/link";
import { listTags, lessonsForTag } from "@/lib/repo/tags";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const tags = await listTags();
  const activeLessons = tag ? await lessonsForTag(tag) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Tags</h1>
      <p className="mt-1 text-sm text-neutral-500">點擊標籤篩選課程</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((t) => (
          <Link key={t.id} href={`/tags?tag=${encodeURIComponent(t.name)}`}>
            <Badge variant={tag === t.name ? "info" : "outline"}>
              #{t.name} ({t.lessonCount})
            </Badge>
          </Link>
        ))}
        {tags.length === 0 && <p className="text-sm text-neutral-400">尚無標籤。</p>}
      </div>

      {tag && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            #{tag} 的課程
          </h2>
          <div className="space-y-2">
            {activeLessons.map((l) => (
              <Link
                key={l.id}
                href={`/lessons/${l.id}`}
                className="block rounded-md border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                <div className="text-xs text-neutral-400">{formatDate(l.date)}</div>
                <div className="text-sm font-medium">{l.title}</div>
              </Link>
            ))}
            {activeLessons.length === 0 && (
              <p className="text-sm text-neutral-400">此標籤尚未套用在任何課程。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
