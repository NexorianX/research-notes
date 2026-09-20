export type LessonProvider = "doway" | "manual" | "upload";
export type ImportStatus =
  | "IMPORTING"
  | "IMPORTED"
  | "PARTIAL"
  | "FAILED"
  | "MANUAL";
export type ReviewStatusValue =
  | "NOT_REVIEWED"
  | "REVIEWED"
  | "NEED_REVIEW"
  | "EXAM_FOCUS";

export interface Course {
  id: string;
  name: string;
  description: string | null;
  semester: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  week: number | null;
  date: string;
  title: string;
  duration: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonSource {
  id: string;
  lessonId: string;
  provider: LessonProvider;
  sourceUrl: string | null;
  externalId: string | null;
  importStatus: ImportStatus;
  importedAt: string | null;
  rawData: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptLine {
  time?: string;
  speaker?: string;
  text: string;
}

export interface MindMapNode {
  name: string;
  children?: MindMapNode[];
}

export interface LessonContent {
  id: string;
  lessonId: string;
  summary: string | null;
  transcript: TranscriptLine[] | null;
  mindMap: MindMapNode | { imageUrl: string } | null;
  audioUrl: string | null;
  updatedAt: string;
}

export interface Note {
  id: string;
  lessonId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Bookmark {
  id: string;
  lessonId: string;
  createdAt: string;
}

export interface ReviewStatus {
  id: string;
  lessonId: string;
  status: ReviewStatusValue;
  updatedAt: string;
}

export interface ThesisIdea {
  id: string;
  lessonId: string;
  sourceType: string;
  sourceText: string | null;
  content: string;
  createdAt: string;
  tags: string[];
}

// Composite shape used by the Lesson list / timeline views
export interface LessonSummaryView {
  id: string;
  courseId: string;
  courseName: string;
  week: number | null;
  date: string;
  title: string;
  duration: string | null;
  tags: string[];
  hasNotes: boolean;
  isBookmarked: boolean;
  reviewStatus: ReviewStatusValue;
  summaryPreview: string | null;
  importStatus: ImportStatus | null;
  provider: LessonProvider | null;
}

export interface CourseCardView extends Course {
  lessonCount: number;
  noteCount: number;
  needReviewCount: number;
  lastLessonDate: string | null;
}

// Normalized shape every importer must produce, regardless of provider.
export interface NormalizedLessonSource {
  provider: LessonProvider;
  sourceUrl: string;
  externalId: string;
  importStatus: ImportStatus;
  errorMessage?: string;
  title?: string | null;
  summary?: string | null;
  transcript?: TranscriptLine[] | null;
  mindMap?: MindMapNode | { imageUrl: string } | null;
  audioUrl?: string | null;
  rawData?: unknown;
}
