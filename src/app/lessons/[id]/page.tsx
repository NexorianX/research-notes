import { getStudy } from "@/lib/repo/study";
import { notFound } from "next/navigation";
import {
  getLesson,
  getLessonSource,
  getLessonContent,
} from "@/lib/repo/lessons";
import { getCourse } from "@/lib/repo/courses";
import { getOrCreateNoteForLesson } from "@/lib/repo/notes";
import { getTagsForLesson } from "@/lib/repo/tags";
import { isBookmarked } from "@/lib/repo/bookmarks";
import { getReviewStatus } from "@/lib/repo/review";
import { listThesisIdeasForLesson } from "@/lib/repo/thesis";
import { LessonDetailClient } from "@/components/lesson-detail-client";

export const dynamic = "force-dynamic";

export default async function LessonDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{tab?:string; q?:string}>;
}) {
  const { id } = await params;
  const navigation = await searchParams;
  const lesson = await getLesson(id);
  if (!lesson) notFound();
  const course = await getCourse(lesson.courseId);
  if (!course) notFound();

  const source = await getLessonSource(id);
  const content = await getLessonContent(id);
  const note = await getOrCreateNoteForLesson(id);
  const tags = await getTagsForLesson(id);
  const bookmarked = await isBookmarked(id);
  const reviewStatus = await getReviewStatus(id);
  const thesisIdeas = await listThesisIdeasForLesson(id);

  return (
    <LessonDetailClient
      key={id}
      initialStudy={await getStudy(id)}
      initialTab={navigation.tab}
      searchQuery={navigation.q}
      lesson={lesson}
      course={course}
      source={source}
      content={content}
      initialNoteContent={note.content}
      initialTags={tags}
      initialBookmarked={bookmarked}
      initialReviewStatus={reviewStatus}
      initialThesisIdeas={thesisIdeas}
    />
  );
}
