"use client";
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

  const [notes, setNotes] = React.useState(initialNoteContent);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bookmarked, setBookmarked] = React.useState(initialBookmarked);
  const [reviewStatus, setReviewStatus] = React.useState(initialReviewStatus);
  const [tags, setTags] = React.useState(initialTags);
  const [thesisIdeas, setThesisIdeas] = React.useState(initialThesisIdeas);
  const [editOpen, setEditOpen] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [thesisDraft, setThesisDraft] = React.useState<{
    sourceType: string;
    sourceText: string;
  } | null>(null);

  const doSave = React.useCallback(
    async (value: string) => {
      setSaveState("saving");
      try {
        await fetch(`/api/lessons/${lesson.id}/notes`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: value }),
        });
        setSaveState("saved");
        setLastSaved(new Date());
      } catch {
        setSaveState("idle");
      }
    },
    [lesson.id]
  );

  function handleNotesChange(value: string) {
    setNotes(value);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(value), 800);
  }

  function insertQuoteIntoNotes(text: string) {
    const block = `> ${text.trim()}\n\n我的想法：\n\n`;
    const next = notes ? `${notes}\n\n${block}` : block;
    handleNotesChange(next);
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
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved" && lastSaved
      ? `Saved · Last saved ${lastSaved.toLocaleTimeString("zh-TW", {
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
            {lesson.week != null && <span>· Week {lesson.week}</span>}
            <span>· {formatDate(lesson.date)}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {lesson.title}
          </h1>
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
          <Tabs defaultValue="overview">
            <TabsList className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-full sm:overflow-visible sm:px-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="notes">My Notes</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="課程" value={course.name} />
                  <Field label="日期" value={formatDate(lesson.date)} />
                  <Field label="Week" value={lesson.week != null ? String(lesson.week) : "—"} />
                  <Field label="Title" value={lesson.title} />
                  <Field label="Duration" value={lesson.duration ?? "—"} />
                  <Field label="Review" value={reviewLabel(reviewStatus)} />
                </dl>
                {source?.sourceUrl && (
                  <Field label="原始網址" value={source.sourceUrl} mono />
                )}
                <div>
                  <div className="mb-1 text-xs font-medium text-neutral-400">Tags</div>
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
                  <div className="mb-1 text-xs font-medium text-neutral-400">Summary Preview</div>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    {content?.summary ? content.summary.slice(0, 200) + "…" : "尚無 Summary"}
                  </p>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-neutral-400">我的 Notes Preview</div>
                  <p className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">
                    {notes ? notes.slice(0, 200) : "尚未撰寫筆記"}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary">
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
                  lines={content.transcript}
                  onAddToNotes={insertQuoteIntoNotes}
                  onAddThesisIdea={(text) =>
                    setThesisDraft({ sourceType: "transcript", sourceText: text })
                  }
                />
              ) : (
                <EmptyState
                  lessonId={lesson.id}
                  sourceUrl={source?.sourceUrl}
                  kind="transcript"
                  onManual={() => setManualOpen(true)}
                />
              )}
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>My Notes（自動儲存，支援 Markdown）</span>
                  <span>{saveLabel}</span>
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={16}
                  placeholder={
                    "# 標題\n- 重點一\n- 重點二\n\n> 引用 Transcript 內容\n我的想法：..."
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
                <Field label="External ID" value={source?.externalId || "無"} />
                <Field
                  label="匯入狀態"
                  value={source ? importStatusLabel(source.importStatus) : "無"}
                />
                <Field
                  label="匯入時間"
                  value={source?.importedAt ? formatDateTime(source.importedAt) : "尚未匯入"}
                />
                {source?.errorMessage && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    {source.errorMessage}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
                    手動貼上 Summary / Transcript
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
          <PanelSection title="Course">
            <p className="text-sm">{course.name}</p>
          </PanelSection>
          <PanelSection title="Week / Date">
            <p className="text-sm">
              {lesson.week != null ? `Week ${lesson.week} · ` : ""}
              {formatDate(lesson.date)}
            </p>
          </PanelSection>
          <PanelSection title="Review">
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
          <PanelSection title="Bookmark">
            <Button variant="outline" size="sm" className="w-full" onClick={toggleBookmark}>
              {bookmarked ? "取消收藏" : "加入收藏"}
            </Button>
          </PanelSection>
          <PanelSection title="Tags">
            <div className="flex flex-wrap gap-1">
              {tags.length === 0 && <span className="text-xs text-neutral-400">無</span>}
              {tags.map((t) => (
                <Badge key={t} variant="outline">
                  #{t}
                </Badge>
              ))}
            </div>
          </PanelSection>
          <PanelSection title="Source">
            <p className="text-xs text-neutral-500">
              {source ? importStatusLabel(source.importStatus) : "無來源"}
            </p>
          </PanelSection>
          <PanelSection title="Notes">
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

      <ManualContentDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        lessonId={lesson.id}
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
      if (!sel || sel.isCollapsed || !ref.current) {
        setSelected("");
        return;
      }
      const text = sel.toString().trim();
      if (text && ref.current.contains(sel.anchorNode)) {
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
          <Button size="sm" variant="outline" onClick={() => onAddToNotes(selected)}>
            加入筆記
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAddThesisIdea(selected)}>
            <Lightbulb className="h-3.5 w-3.5" />
            論文靈感
          </Button>
        </div>
      )}
      <div ref={ref}>{children}</div>
    </div>
  );
}

function TranscriptView({
  lines,
  onAddToNotes,
  onAddThesisIdea,
}: {
  lines: TranscriptLine[];
  onAddToNotes: (text: string) => void;
  onAddThesisIdea: (text: string) => void;
}) {
  const [query, setQuery] = React.useState("");

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
    ? lines.filter((l) => l.text.toLowerCase().includes(query.toLowerCase()))
    : lines;

  return (
    <SelectableBlock onAddToNotes={onAddToNotes} onAddThesisIdea={onAddThesisIdea}>
      <div className="mb-3 flex items-center gap-2">
        <SearchIcon className="h-4 w-4 text-neutral-400" />
        <Input
          placeholder="搜尋 Transcript…"
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
        {filtered.map((line, i) => (
          <div key={i} className="flex gap-3">
            {line.time && (
              <span className="w-14 shrink-0 font-mono text-xs text-neutral-400">
                {line.time}
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
  kind,
  sourceUrl,
  onManual,
}: {
  lessonId: string;
  sourceUrl?: string | null;
  kind: "summary" | "transcript";
  onManual: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
      <p>內容目前無法自動讀取。原始連結已保存，課程已成功建立。</p>
      <p className="mt-1 text-xs">
        這是一次性擷取，沒有自動重抓機制:你可以手動貼上
        {kind === "summary" ? "Summary" : "Transcript"}，或開啟{ORIGINAL_PAGE_LABEL}查看。
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
          <DialogTitle>編輯 Lesson</DialogTitle>
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
              <Label>Week</Label>
              <Input type="number" value={week} onChange={(e) => setWeek(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Duration</Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="例如 90 分鐘"
            />
          </div>
          <div className="space-y-1">
            <Label>Tags</Label>
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
  initialSummary,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lessonId: string;
  initialSummary: string;
  onSaved: () => void;
}) {
  const [summary, setSummary] = React.useState(initialSummary);
  const [transcript, setTranscript] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setSummary(initialSummary);
  }, [open, initialSummary]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/lessons/${lessonId}/manual-content`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ summary, transcript: transcript || undefined }),
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>手動貼上 Summary / Transcript</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Summary（支援 Markdown）</Label>
            <Textarea rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Transcript（純文字）</Label>
            <Textarea rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
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
            <Label>Tags</Label>
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
