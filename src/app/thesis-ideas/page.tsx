import Link from "next/link";
import { listThesisIdeas } from "@/lib/repo/thesis";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DeleteThesisButton } from "@/components/delete-thesis-button";

export const dynamic = "force-dynamic";

export default async function ThesisIdeasPage() {
  const ideas = await listThesisIdeas();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        Thesis Ideas
      </h1>
      <p className="mt-1 text-sm text-neutral-500">所有課堂中收集的論文靈感</p>

      <div className="mt-6 space-y-3">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/lessons/${idea.lessonId}`}
                className="text-xs text-neutral-400 hover:underline"
              >
                {idea.courseName} · {formatDate(idea.lessonDate)} · {idea.lessonTitle}
              </Link>
              <DeleteThesisButton id={idea.id} />
            </div>
            {idea.sourceText && (
              <blockquote className="mt-1 border-l-2 border-neutral-300 pl-2 text-xs text-neutral-500 dark:border-neutral-700">
                {idea.sourceText}
              </blockquote>
            )}
            <p className="mt-1 whitespace-pre-wrap text-sm">{idea.content}</p>
            {idea.tags.length > 0 && (
              <div className="mt-2 flex gap-1">
                {idea.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {ideas.length === 0 && (
          <p className="text-sm text-neutral-400">
            尚無論文靈感。在 Lesson 的 Summary 或 Transcript 中選取文字即可加入。
          </p>
        )}
      </div>
    </div>
  );
}
