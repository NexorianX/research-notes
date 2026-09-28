import { getStudy } from "@/lib/repo/study";
import { notFound } from "next/navigation";
import {
  getLesson,
  getLessonSource,
  getLessonContent,
} from "@/lib/repo/lessons";
import { getCourse } from "@/lib/repo/courses";
import { getNoteForLesson } from "@/lib/repo/notes";
import { getTagsForLesson } from "@/lib/repo/tags";
import { isBookmarked } from "@/lib/repo/bookmarks";
import { getReviewStatus } from "@/lib/repo/review";
import { listThesisIdeasForLesson } from "@/lib/repo/thesis";
import { LessonDetailClient } from "@/components/lesson-detail-client";

export const dynamic = "force-dynamic";

export default async function LessonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { id } = await params;
  const navigation = await searchParams;
  const lesson = await getLesson(id);
  if (!lesson) notFound();
  const [
    course,
    source,
    content,
    note,
    tags,
    bookmarked,
    reviewStatus,
    thesisIdeas,
    study,
  ] = await Promise.all([
    getCourse(lesson.courseId),
    getLessonSource(id),
    getLessonContent(id),
    getNoteForLesson(id),
    getTagsForLesson(id),
    isBookmarked(id),
    getReviewStatus(id),
    listThesisIdeasForLesson(id),
    getStudy(id),
  ]);
  if (!course) notFound();

  return (
    <LessonDetailClient
      key={id}
      initialStudy={study}
      initialTab={navigation.tab}
      searchQuery={navigation.q}
      lesson={lesson}
      course={course}
      source={source ? { ...source, rawData: null } : null}
      content={content}
      initialNoteContent={note?.content ?? ""}
      initialTags={tags}
      initialBookmarked={bookmarked}
      initialReviewStatus={reviewStatus}
      initialThesisIdeas={thesisIdeas}
    />
  );
}
