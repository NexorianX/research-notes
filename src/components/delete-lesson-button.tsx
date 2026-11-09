"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DeleteLessonButton({ lessonId, title, courseId, onDeleted }: {
  lessonId: string; title: string; courseId: string; onDeleted: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  async function remove() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error("刪除失敗，筆記仍保留。請稍後重試。");
      onDeleted();
      router.replace(`/courses/${courseId}`);
      router.refresh();
    } catch {
      setError("刪除失敗，請檢查連線後重試。");
      inFlight.current = false; setBusy(false);
    }
  }
  return <>
    <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400" onClick={() => {setError("");setOpen(true);}}><Trash2 className="h-4 w-4"/>刪除這堂筆記</Button>
    <Dialog open={open} onOpenChange={value => {if (!busy) setOpen(value);}}>
      <DialogContent onOpenAutoFocus={event => {event.preventDefault(); document.getElementById(`cancel-delete-${lessonId}`)?.focus();}}>
        <DialogHeader><DialogTitle>刪除這堂筆記？</DialogTitle><DialogDescription>將永久刪除「{title}」。這個操作無法復原。</DialogDescription></DialogHeader>
        <p className="text-sm">會一併移除這堂課的摘要、逐字稿、思維圖、校訂與學習筆記、個人筆記、收藏、複習紀錄及論文靈感。其他課堂與原始錄音分享頁不受影響。</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button id={`cancel-delete-${lessonId}`} variant="outline" disabled={busy} onClick={() => setOpen(false)}>取消</Button><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? "刪除中…" : "確認永久刪除"}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
