"use client";
import { appendQuote } from "@/lib/note-quotes";
import { ImportDowayModal } from "@/components/import-doway-modal";
import { StudyWorkspace } from "@/components/study-workspace";
import type { StudyDocument } from "@/lib/study";
import * as React from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ExternalLink,
  Pencil,
  Bookmark,
  BookmarkCheck,
  Lightbulb,
  Quote,
  Search as SearchIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDate, formatDateTime, reviewLabel } from "@/lib/utils";
import { importStatusLabel, providerLabel, ORIGINAL_PAGE_LABEL } from "@/lib/provider-labels";
import type {
  Lesson,
  LessonSource,
  LessonContent,
  Course,
  ReviewStatusValue,
  ThesisIdea,
  TranscriptLine,
} from "@/lib/types";

interface Props {
  initialStudy: StudyDocument;
  initialTab?: string;
  searchQuery?: string;
  lesson: Lesson;
  course: Course;
  source: LessonSource | null;
  content: LessonContent | null;
  initialNoteContent: string;
  initialTags: string[];
  initialBookmarked: boolean;
  initialReviewStatus: ReviewStatusValue;
  initialThesisIdeas: ThesisIdea[];
}

const REVIEW_OPTIONS: { value: ReviewStatusValue; label: string }[] = [
  { value: "NOT_REVIEWED", label: "○ 尚未複習" },
  { value: "REVIEWED", label: "✓ 已複習" },
  { value: "NEED_REVIEW", label: "↻ 需要複習" },
  { value: "EXAM_FOCUS", label: "★ 考試重點" },
];

export function LessonDetailClient({
  initialStudy, initialTab, searchQuery,
  lesson,
  course,
  source,
  content,
  initialNoteContent,
  initialTags,
  initialBookmarked,
  initialReviewStatus,
  initialThesisIdeas,
}: Props) {
  const router = useRouter();
  const [study, setStudy] = React.useState(initialStudy);
  const [activeTab, setActiveTab] = React.useState(initialTab && ["study", "corrections", "practice", "overview", "summary", "mindmap", "transcript", "notes", "source"].includes(initialTab) ? initialTab : "overview");
  const tabsRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const list = tabsRef.current;
    const selected = list?.querySelector<HTMLElement>('[data-state="active"]');
    if (list && selected) list.scrollLeft += selected.getBoundingClientRect().left - list.getBoundingClientRect().left - (list.clientWidth - selected.clientWidth) / 2;
  }, [activeTab]);

  const [notes, setNotes] = React.useState(initialNoteContent);
  const notesRef = React.useRef(initialNoteContent);
  const [quoteMessage, setQuoteMessage] = React.useState("");
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bookmarked, setBookmarked] = React.useState(initialBookmarked);
  const [reviewStatus, setReviewStatus] = React.useState(initialReviewStatus);
  const [tags, setTags] = React.useState(initialTags);
  const [thesisIdeas, setThesisIdeas] = React.useState(initialThesisIdeas);
  const [editOpen, setEditOpen] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [thesisDraft, setThesisDraft] = React.useState<{
    sourceType: string;
    sourceText: string;
  } | null>(null);

  const doSave = React.useCallback(
    async (value: string) => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/lessons/${lesson.id}/notes`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: value }),
        });
        if (!response.ok) throw new Error("Save failed");
        setSaveState("saved");
        setLastSaved(new Date());
      } catch {
        setSaveState("error");
      }
    },
    [lesson.id]
  );

  function handleNotesChange(value: string) {
    notesRef.current = value;
    setNotes(value);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(value), 800);
  }

  function insertQuoteIntoNotes(text: string) {
    const result = appendQuote(notesRef.current, text);
    if (result.added) handleNotesChange(result.content);
    setQuoteMessage(result.added ? "引用已加入下方筆記" : "這段引用已在筆記中，未重複加入");
    setActiveTab("notes");
  }

  async function toggleBookmark() {
    setBookmarked((b) => !b);
    const res = await fetch(`/api/lessons/${lesson.id}/bookmark`, { method: "POST" });
    const data = await res.json();
    setBookmarked(data.bookmarked);
  }

  async function changeReviewStatus(status: ReviewStatusValue) {
    setReviewStatus(status);
    await fetch(`/api/lessons/${lesson.id}/review`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function submitThesisIdea(ideaContent: string, tagStr: string) {
    if (!thesisDraft) return;
    const res = await fetch(`/api/lessons/${lesson.id}/thesis-ideas`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceType: thesisDraft.sourceType,
        sourceText: thesisDraft.sourceText,
        content: ideaContent,
        tags: tagStr
          .split(/[,\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setThesisIdeas((prev) => [data.idea, ...prev]);
      setThesisDraft(null);
    }
  }

  const saveLabel =
    saveState === "error"
      ? "儲存失敗，請保留內容並再次編輯以儲存"
      : saveState === "saving"
      ? "儲存中…"
      : saveState === "saved" && lastSaved
      ? `已儲存 · ${lastSaved.toLocaleTimeString("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span>{course.name}</span>
            {lesson.week != null && <span>· 第 {lesson.week} 週</span>}
            <span>· {formatDate(lesson.date)}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {lesson.title}
          </h1>
          {source && <Badge className="mt-2" variant={source.importStatus === "IMPORTED" ? "success" : source.importStatus === "FAILED" ? "danger" : "outline"}>{importStatusLabel(source.importStatus)}</Badge>}
          {source?.sourceUrl && (
            <p className="mt-1 text-xs text-neutral-400">
              來源:{providerLabel(source.provider)} · {source.sourceUrl}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleBookmark}>
            {bookmarked ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {bookmarked ? "已收藏" : "收藏"}
          </Button>
          {source?.sourceUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                {ORIGINAL_PAGE_LABEL}
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            編輯
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList ref={tabsRef} className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-full sm:overflow-x-auto sm:px-0">
              <TabsTrigger value="overview">課程概覽</TabsTrigger>
              <TabsTrigger value="corrections">逐字稿校訂</TabsTrigger>
              <TabsTrigger value="study">學習筆記</TabsTrigger>
              <TabsTrigger value="practice">複習測驗</TabsTrigger>
              <TabsTrigger value="summary">摘要</TabsTrigger>
              <TabsTrigger value="mindmap">思維圖</TabsTrigger>
              <TabsTrigger value="transcript">逐字稿</TabsTrigger>
              <TabsTrigger value="notes">我的筆記</TabsTrigger>
              <TabsTrigger value="source">來源與匯入</TabsTrigger>
            </TabsList>

            {(["corrections", "study", "practice"] as const).map(mode => <TabsContent key={mode} value={mode} forceMount className="data-[state=inactive]:hidden"><StudyWorkspace lessonId={lesson.id} doc={study} setDoc={setStudy} lines={content?.transcript ?? []} mode={mode}/></TabsContent>)}
            <TabsContent value="overview">
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="課程" value={course.name} />
                  <Field label="日期" value={formatDate(lesson.date)} />
                  <Field label="週次" value={lesson.week != null ? String(lesson.week) : "—"} />
                  <Field label="標題" value={lesson.title} />
                  <Field label="時長" value={lesson.duration ?? "—"} />
                  <Field label="複習狀態" value={reviewLabel(reviewStatus)} />
                </dl>
                {source?.sourceUrl && (
                  <Field label="原始網址" value={source.sourceUrl} mono />
                )}
                <div>
                  <div className="mb-1 text-xs font-medium text-neutral-400">標籤</div>
                  <div className="flex flex-wrap gap-1">
                    {tags.length === 0 && <span className="text-xs text-neutral-400">尚無標籤</span>}
                    {tags.map((t) => (
                      <Badge key={t} variant="outline">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-neutral-400">摘要預覽</div>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    {content?.summary ? content.summary.slice(0, 200) + "…" : "尚無摘要"}
                  </p>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-neutral-400">個人筆記預覽</div>
                  <p className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">
                    {notes ? notes.slice(0, 200) : "尚未撰寫筆記"}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary">
              <p className="mb-3 text-xs text-neutral-500">以下為來源整理摘要；整理學習筆記時，請以逐字稿與錄音核對。</p>
              {content?.summary ? (
                <SelectableBlock
                  onAddToNotes={insertQuoteIntoNotes}
                  onAddThesisIdea={(text) =>
                    setThesisDraft({ sourceType: "summary", sourceText: text })
                  }
                >
                  <div className="prose-notes text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content.summary}
                    </ReactMarkdown>
                  </div>
                </SelectableBlock>
              ) : (
                <EmptyState
                  pending={source?.importStatus === "PENDING"}
                  lessonId={lesson.id}
                  sourceUrl={source?.sourceUrl}
                  kind="summary"
                  onManual={() => setManualOpen(true)}
                />
              )}
            </TabsContent>

            <TabsContent value="mindmap">
              <MindMapView content={content} sourceUrl={source?.sourceUrl ?? null} />
            </TabsContent>

            <TabsContent value="transcript">
              {content?.transcript && content.transcript.length > 0 ? (
                <TranscriptView
                  initialQuery={searchQuery}
                  lines={content.transcript}
                  onAddToNotes={insertQuoteIntoNotes}
                  onAddThesisIdea={(text) =>
                    setThesisDraft({ sourceType: "transcript", sourceText: text })
                  }
                />
              ) : (
                <EmptyState
                  pending={source?.importStatus === "PENDING"}
                  lessonId={lesson.id}
                  sourceUrl={source?.sourceUrl}
                  kind="transcript"
                  onManual={() => setManualOpen(true)}
                />
              )}
            </TabsContent>

            <TabsContent value="notes">
              {quoteMessage && <p role="status" className="mb-3 text-sm text-emerald-700 dark:text-emerald-400">{quoteMessage}</p>}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>我的筆記（自動儲存，支援 Markdown）</span>
                  <span role="status" aria-live="polite">{saveLabel}</span>
                </div>
                {saveState === "error" && <Button variant="outline" size="sm" onClick={() => doSave(notes)}>重試儲存</Button>}
                <Textarea
                  aria-label="我的筆記"
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={16}
                  placeholder={
                    "# 標題\n- 重點一\n- 重點二\n\n> 引用逐字稿內容\n我的想法：..."
                  }
                  className="font-mono text-sm"
                />
                <details className="text-xs text-neutral-400">
                  <summary className="cursor-pointer">預覽 Markdown</summary>
                  <div className="prose-notes mt-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {notes || "*尚無內容*"}
                    </ReactMarkdown>
                  </div>
                </details>
              </div>
            </TabsContent>

            <TabsContent value="source">
              <div className="space-y-3 text-sm">
                <Field
                  label="來源類型"
                  value={source ? providerLabel(source.provider) : "無"}
                />
                <Field label="原始網址" value={source?.sourceUrl || "無"} mono />
                <Field label="來源編號" value={source?.externalId || "無"} />
                <Field
                  label="匯入狀態"
                  value={source ? importStatusLabel(source.importStatus) : "無"}
                />
                <Field
                  label="匯入時間"
                  value={source?.importedAt ? formatDateTime(source.importedAt) : "尚未匯入"}
                />
                {source?.importStatus && <p className="rounded-md border p-3 text-sm">{source.importStatus === "PENDING" ? "尚未擷取內容。請按「匯入課程錄音」，貼上此課堂的原始網址完成首次匯入。" : source.importStatus === "PARTIAL" || source.importStatus === "FAILED" ? "首次擷取已結束。請開啟原始頁面取得缺漏內容，再使用下方「手動補件」；既有內容會保留。" : "來源已保存；校訂請至「逐字稿校訂」，整理重點請至「學習筆記」。"}</p>}
                {source?.errorMessage && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    {source.errorMessage}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {source?.importStatus === "PENDING" && <Button size="sm" onClick={() => setImportOpen(true)}>開始首次匯入</Button>}
                  <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
                    手動補件（摘要／逐字稿）
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Thesis ideas captured from this lesson */}
          {thesisIdeas.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                本堂課的論文靈感
              </h3>
              <div className="space-y-2">
                {thesisIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    id={`idea-${idea.id}`}
                    className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
                  >
                    {idea.sourceText && (
                      <blockquote className="border-l-2 border-neutral-300 pl-2 text-xs text-neutral-500 dark:border-neutral-700">
                        {idea.sourceText}
                      </blockquote>
                    )}
                    <p className="mt-1 whitespace-pre-wrap">{idea.content}</p>
                    {idea.tags.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {idea.tags.map((t) => (
                          <Badge key={t} variant="outline">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Context panel */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <PanelSection title="課程">
            <p className="text-sm">{course.name}</p>
          </PanelSection>
          <PanelSection title="週次／日期">
            <p className="text-sm">
              {lesson.week != null ? `第 ${lesson.week} 週 · ` : ""}
              {formatDate(lesson.date)}
            </p>
          </PanelSection>
          <PanelSection title="複習狀態">
            <Select value={reviewStatus} onValueChange={(v) => changeReviewStatus(v as ReviewStatusValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PanelSection>
          <PanelSection title="收藏">
            <Button variant="outline" size="sm" className="w-full" onClick={toggleBookmark}>
              {bookmarked ? "取消收藏" : "加入收藏"}
            </Button>
          </PanelSection>
          <PanelSection title="標籤">
            <div className="flex flex-wrap gap-1">
              {tags.length === 0 && <span className="text-xs text-neutral-400">無</span>}
              {tags.map((t) => (
                <Badge key={t} variant="outline">
                  #{t}
                </Badge>
              ))}
            </div>
          </PanelSection>
          <PanelSection title="來源與匯入">
            <p className="text-xs text-neutral-500">
              {source ? importStatusLabel(source.importStatus) : "無來源"}
            </p>
          </PanelSection>
          <PanelSection title="筆記">
            <p className="text-xs text-neutral-500">
              {notes.trim() ? `${notes.trim().length} 字` : "尚未撰寫"}
            </p>
          </PanelSection>
        </aside>
      </div>

      <EditLessonDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lesson={lesson}
        tags={tags}
        onSaved={(t) => {
          setTags(t);
          router.refresh();
        }}
      />

      <ImportDowayModal courses={[course]} open={importOpen} onOpenChange={setImportOpen} defaultCourseId={course.id} defaultUrl={source?.sourceUrl ?? undefined} defaultDate={lesson.date} defaultWeek={lesson.week}/>
      <ManualContentDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        lessonId={lesson.id}
        hasTranscript={!!content?.transcript?.length}
        initialSummary={content?.summary ?? ""}
        onSaved={() => router.refresh()}
      />

      <ThesisIdeaDialog
        draft={thesisDraft}
        onClose={() => setThesisDraft(null)}
        onSubmit={submitThesisIdea}
      />
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-400">{label}</div>
      <div className={mono ? "break-all font-mono text-xs" : "text-sm"}>{value}</div>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function SelectableBlock({
  children,
  onAddToNotes,
  onAddThesisIdea,
}: {
  children: React.ReactNode;
  onAddToNotes: (text: string) => void;
  onAddThesisIdea: (text: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [selected, setSelected] = React.useState("");

  React.useEffect(() => {
    function handler() {
      const sel = window.getSelection();
      // Keep the captured quote when button focus collapses the browser selection.
      // Otherwise selectionchange can unmount the button before click is delivered.
      if (!sel || sel.isCollapsed || !ref.current) return;
      const text = sel.toString().trim();
      if (text && ref.current.contains(sel.anchorNode) && ref.current.contains(sel.focusNode)) {
        setSelected(text);
      } else {
        setSelected("");
      }
    }
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  return (
    <div>
      {selected && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs dark:border-neutral-800 dark:bg-neutral-900">
          <Quote className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1 flex-1 text-neutral-500">「{selected}」</span>
          <Button size="sm" variant="outline" onClick={() => { onAddToNotes(selected); setSelected(""); }}>
            加入筆記
          </Button>
          <Button size="sm" variant="outline" onClick={() => { onAddThesisIdea(selected); setSelected(""); }}>
            <Lightbulb className="h-3.5 w-3.5" />
            論文靈感
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected("")}>取消選取</Button>
        </div>
      )}
      <div ref={ref}>{children}</div>
    </div>
  );
}

function TranscriptView({
  initialQuery,
  lines,
  onAddToNotes,
  onAddThesisIdea,
}: {
  initialQuery?: string;
  lines: TranscriptLine[];
  onAddToNotes: (text: string) => void;
  onAddThesisIdea: (text: string) => void;
}) {
  const [query, setQuery] = React.useState(initialQuery ?? "");

  function highlight(text: string) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-700">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  const filtered = query.trim()
    ? lines.map((line,index)=>({line,index})).filter(({line}) => line.text.toLowerCase().includes(query.toLowerCase()))
    : lines.map((line,index)=>({line,index}));

  return (
    <SelectableBlock onAddToNotes={onAddToNotes} onAddThesisIdea={onAddThesisIdea}>
      <div className="mb-3 flex items-center gap-2">
        <SearchIcon className="h-4 w-4 text-neutral-400" />
        <Input
          placeholder="搜尋逐字稿…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(lines.map((l) => l.text).join("\n"))}
        >
          複製全部
        </Button>
      </div>
      <div className="space-y-3 text-sm">
        {filtered.map(({line, index}) => (
          <div id={`segment-${index}`} key={index} className="flex gap-3 scroll-mt-6 rounded-md p-2 target:bg-amber-50 target:ring-2 target:ring-amber-400 dark:target:bg-amber-950">
            {line.time && (
              <span className="w-14 shrink-0 font-mono text-xs text-neutral-400">
                {line.time}{line.endTime && <><br /><span>– {line.endTime}</span></>}
              </span>
            )}
            <div>
              {line.speaker && (
                <div className="text-xs font-medium text-neutral-500">{line.speaker}</div>
              )}
              <p className="leading-relaxed">{highlight(line.text)}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-400">找不到符合的內容</p>
        )}
      </div>
    </SelectableBlock>
  );
}

function MindMapView({
  content,
  sourceUrl,
}: {
  content: LessonContent | null;
  sourceUrl: string | null;
}) {
  const mindMap = content?.mindMap;
  if (!mindMap) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        <p>請至{ORIGINAL_PAGE_LABEL}查看心智圖</p>
        {sourceUrl && (
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              開啟{ORIGINAL_PAGE_LABEL}
            </a>
          </Button>
        )}
      </div>
    );
  }
  if ("imageUrl" in mindMap) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mindMap.imageUrl} alt="Mind Map" className="max-w-full rounded-md border border-neutral-200 dark:border-neutral-800" />
    );
  }
  return <MindMapTree node={mindMap} depth={0} />;
}

function MindMapTree({ node, depth }: { node: { name: string; children?: { name: string; children?: unknown }[] }; depth: number }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div style={{ marginLeft: depth * 16 }} className="text-sm">
      <div className="flex items-center gap-1 py-0.5">
        {hasChildren ? (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-4 text-xs text-neutral-400"
          >
            {collapsed ? "▸" : "▾"}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className={depth === 0 ? "font-semibold" : ""}>{node.name}</span>
      </div>
      {hasChildren && !collapsed && (
        <div className="border-l border-neutral-200 dark:border-neutral-800">
          {node.children!.map((child, i) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <MindMapTree key={i} node={child as any} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  pending,
  kind,
  sourceUrl,
  onManual,
}: {
  pending?: boolean;
  lessonId: string;
  sourceUrl?: string | null;
  kind: "summary" | "transcript";
  onManual: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
      <p>{pending ? "目前只保存課堂紀錄，尚未執行首次匯入。請使用「匯入課程錄音」並貼上原始網址。" : "內容目前無法自動讀取。原始連結已保存，課程已成功建立。"}</p>
      <p className="mt-1 text-xs">
        這是一次性擷取，沒有自動重抓機制:你可以手動貼上
        {kind === "summary" ? "摘要" : "逐字稿"}，或開啟{ORIGINAL_PAGE_LABEL}查看。
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onManual}>
          手動貼上
        </Button>
        {sourceUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              開啟{ORIGINAL_PAGE_LABEL}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function EditLessonDialog({
  open,
  onOpenChange,
  lesson,
  tags,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson;
  tags: string[];
  onSaved: (tags: string[]) => void;
}) {
  const [title, setTitle] = React.useState(lesson.title);
  const [date, setDate] = React.useState(lesson.date.slice(0, 10));
  const [week, setWeek] = React.useState(lesson.week != null ? String(lesson.week) : "");
  const [duration, setDuration] = React.useState(lesson.duration ?? "");
  const [tagStr, setTagStr] = React.useState(tags.join(" "));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(lesson.title);
      setDate(lesson.date.slice(0, 10));
      setWeek(lesson.week != null ? String(lesson.week) : "");
      setDuration(lesson.duration ?? "");
      setTagStr(tags.join(" "));
    }
  }, [open, lesson, tags]);

  async function handleSave() {
    setSaving(true);
    const newTags = tagStr
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch(`/api/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        date,
        week: week ? Number(week) : null,
        duration: duration || null,
        tags: newTags,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved(newTags);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯課堂</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>標題</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>日期</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>週次</Label>
              <Input type="number" value={week} onChange={(e) => setWeek(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>時長</Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="例如 90 分鐘"
            />
          </div>
          <div className="space-y-1">
            <Label>標籤</Label>
            <Input value={tagStr} onChange={(e) => setTagStr(e.target.value)} />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              儲存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManualContentDialog({
  open,
  onOpenChange,
  lessonId,
  initialSummary, hasTranscript,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lessonId: string;
  initialSummary: string;
  hasTranscript: boolean;
  onSaved: () => void;
}) {
  const [summary, setSummary] = React.useState(initialSummary);
  const [transcript, setTranscript] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) setSummary(initialSummary);
  }, [open, initialSummary]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/lessons/${lessonId}/manual-content`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ summary: initialSummary ? undefined : summary, transcript: hasTranscript ? undefined : transcript || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "補件儲存失敗");
      onOpenChange(false); onSaved();
    } catch (e) {setError(e instanceof Error ? e.message : "補件儲存失敗，請再試一次");}
    finally {setSaving(false);}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>手動補件（摘要／逐字稿）</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-neutral-500">僅補入缺漏欄位，已有原文不覆寫。</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>摘要（支援 Markdown）</Label>
            <Textarea disabled={!!initialSummary} rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>逐字稿（純文字）</Label>
            <Textarea disabled={hasTranscript} placeholder={hasTranscript ? "已有原始逐字稿，請使用「逐字稿校訂」" : "貼上缺漏的原文"} rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              儲存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThesisIdeaDialog({
  draft,
  onClose,
  onSubmit,
}: {
  draft: { sourceType: string; sourceText: string } | null;
  onClose: () => void;
  onSubmit: (content: string, tags: string) => void;
}) {
  const [content, setContent] = React.useState("");
  const [tagStr, setTagStr] = React.useState("#論文Idea");

  React.useEffect(() => {
    if (draft) setContent("");
  }, [draft]);

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>💡 加入論文靈感</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {draft?.sourceText && (
            <blockquote className="border-l-2 border-neutral-300 pl-2 text-sm text-neutral-500 dark:border-neutral-700">
              {draft.sourceText}
            </blockquote>
          )}
          <div className="space-y-1">
            <Label>我的想法</Label>
            <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>標籤</Label>
            <Input value={tagStr} onChange={(e) => setTagStr(e.target.value)} />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => content.trim() && onSubmit(content, tagStr)}>加入</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
