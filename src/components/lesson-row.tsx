import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate, reviewIcon } from "@/lib/utils";
import { importStatusLabel } from "@/lib/provider-labels";
import type { LessonSummaryView } from "@/lib/types";
import { Bookmark, StickyNote } from "lucide-react";

export function LessonRow({
  lesson,
  showCourse = true,
}: {
  lesson: LessonSummaryView;
  showCourse?: boolean;
}) {
  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className="block rounded-md border border-neutral-200 p-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
        <span>{formatDate(lesson.date)}</span>
        {lesson.week != null && <span>· Week {lesson.week}</span>}
        {showCourse && (
          <>
            <span>·</span>
            <span className="font-medium text-neutral-500 dark:text-neutral-400">
              {lesson.courseName}
            </span>
          </>
        )}
        <span className="ml-auto flex items-center gap-2">
          {lesson.isBookmarked && <Bookmark className="h-3.5 w-3.5 fill-current" />}
          {lesson.hasNotes && <StickyNote className="h-3.5 w-3.5" />}
          <span title={reviewIcon(lesson.reviewStatus)}>{reviewIcon(lesson.reviewStatus)}</span>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {lesson.title}
        </h3>
        {lesson.importStatus && (
          <Badge
            variant={
              lesson.importStatus === "IMPORTED"
                ? "success"
                : lesson.importStatus === "PARTIAL"
                ? "warning"
                : lesson.importStatus === "FAILED"
                ? "danger"
                : "default"
            }
          >
            {importStatusLabel(lesson.importStatus)}
          </Badge>
        )}
      </div>
      {lesson.summaryPreview && (
        <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
          {lesson.summaryPreview}
        </p>
      )}
      {lesson.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lesson.tags.map((t) => (
            <Badge key={t} variant="outline">
              #{t}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
}
