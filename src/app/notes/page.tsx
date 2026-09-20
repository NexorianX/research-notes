import Link from "next/link";
import { listAllNotesWithLesson } from "@/lib/repo/notes";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const notes = await listAllNotesWithLesson();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Notes</h1>
      <p className="mt-1 text-sm text-neutral-500">所有課程的個人筆記</p>

      <div className="mt-6 space-y-3">
        {notes.map((n) => (
          <Link
            key={n.id}
            href={`/lessons/${n.lessonId}#notes`}
            className="block rounded-md border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span>{n.courseName}</span>
              <span>· {formatDate(n.lessonDate)}</span>
              <span className="ml-auto">更新於 {formatDateTime(n.updatedAt)}</span>
            </div>
            <h3 className="mt-1 text-sm font-medium">{n.lessonTitle}</h3>
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-neutral-500 dark:text-neutral-400">
              {n.content}
            </p>
          </Link>
        ))}
        {notes.length === 0 && (
          <p className="text-sm text-neutral-400">尚無任何筆記，進入 Lesson 開始撰寫。</p>
        )}
      </div>
    </div>
  );
}
