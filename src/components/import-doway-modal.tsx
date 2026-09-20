"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Course } from "@/lib/types";

type Step = "form" | "importing" | "done" | "error";

export function ImportDowayModal({
  courses,
  open,
  onOpenChange,
  defaultCourseId,
}: {
  courses: Course[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("form");
  const [url, setUrl] = React.useState("");
  const [courseId, setCourseId] = React.useState(defaultCourseId ?? courses[0]?.id ?? "");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [week, setWeek] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [progress, setProgress] = React.useState<{
    summary: boolean;
    transcript: boolean;
    mindMap: boolean;
  } | null>(null);
  const [message, setMessage] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [lessonId, setLessonId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep("form");
      setErrorMsg("");
      setProgress(null);
      if (defaultCourseId) setCourseId(defaultCourseId);
    }
  }, [open, defaultCourseId]);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg("請貼上分享網址");
      return;
    }
    if (!courseId) {
      setErrorMsg("請選擇課程");
      return;
    }
    setStep("importing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/import/doway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          courseId,
          date,
          week: week ? Number(week) : null,
          title: title.trim() || undefined,
          tags: tags
            .split(/[,\s]+/)
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStep("error");
        setErrorMsg(data.error ?? "匯入失敗，請稍後再試");
        return;
      }
      setProgress(data.progress);
      setMessage(data.message);
      setLessonId(data.lesson.id);
      setStep("done");
      router.refresh();
    } catch {
      setStep("error");
      setErrorMsg("網路錯誤，請稍後再試");
    }
  }

  function reset() {
    setUrl("");
    setWeek("");
    setTitle("");
    setTags("");
    setStep("form");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>＋ 匯入課程錄音</DialogTitle>
          <DialogDescription>
            貼上分享網址，選擇課程與日期即可建立課程紀錄。
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleImport} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="doway-url">分享網址</Label>
              <Input
                id="doway-url"
                placeholder="https://www.dowayai.com/share/27293262"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>課程</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇課程" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doway-date">上課日期</Label>
                <Input
                  id="doway-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="doway-week">Week</Label>
                <Input
                  id="doway-week"
                  type="number"
                  min={1}
                  placeholder="3"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="doway-title">課程主題（可留空）</Label>
                <Input
                  id="doway-title"
                  placeholder="電子商務平台策略"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="doway-tags">Tags（以空白或逗號分隔）</Label>
              <Input
                id="doway-tags"
                placeholder="#電子商務 #重要"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit">匯入課程</Button>
            </div>
          </form>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-3 py-6 text-sm text-neutral-600 dark:text-neutral-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>正在解析課程錄音…</p>
            <p className="text-xs text-neutral-400">正在讀取課程內容，請稍候</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">{message}</span>
            </div>
            {progress && (
              <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                <li>{progress.summary ? "✓" : "×"} Summary</li>
                <li>{progress.mindMap ? "✓" : "×"} Mind Map</li>
                <li>{progress.transcript ? "✓" : "×"} Transcript</li>
              </ul>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                關閉
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  if (lessonId) router.push(`/lessons/${lessonId}`);
                }}
              >
                查看課程
              </Button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{errorMsg}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("form")}>
                返回修改
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
