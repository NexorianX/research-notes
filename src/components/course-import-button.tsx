"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportDowayModal } from "@/components/import-doway-modal";
import type { Course } from "@/lib/types";

export function CourseImportButton({
  course,
  allCourses,
}: {
  course: Course;
  allCourses: Course[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        匯入課程錄音
      </Button>
      <ImportDowayModal
        courses={allCourses}
        open={open}
        onOpenChange={setOpen}
        defaultCourseId={course.id}
      />
    </>
  );
}
