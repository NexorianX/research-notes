import { listCourses } from "@/lib/repo/courses";
import { CourseManager } from "@/components/course-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const courses = await listCourses();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">管理課程（可新增未來學期的課程）</p>
      <div className="mt-6">
        <CourseManager initialCourses={courses} />
      </div>
    </div>
  );
}
