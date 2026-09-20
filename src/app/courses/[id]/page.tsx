import { notFound } from "next/navigation";
import { getCourse, listCourses } from "@/lib/repo/courses";
import { listLessonSummaries } from "@/lib/repo/lessons";
import { LessonRow } from "@/components/lesson-row";
import { CourseImportButton } from "@/components/course-import-button";

export const dynamic = "force-dynamic";

export default async function CourseTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();

  const lessons = await listLessonSummaries({ courseId: id });
  const allCourses = await listCourses();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {course.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {course.semester ?? "2026 Fall Semester"}
          </p>
        </div>
        <CourseImportButton course={course} allCourses={allCourses} />
      </div>

      <div className="mt-6 space-y-2 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
        {lessons.map((l) => (
          <LessonRow key={l.id} lesson={l} showCourse={false} />
        ))}
        {lessons.length === 0 && (
          <p className="text-sm text-neutral-400">
            這門課還沒有任何 Lesson，點右上角「匯入課程錄音」開始建立。
          </p>
        )}
      </div>
    </div>
  );
}
