"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { Course } from "@/lib/types";

export function CourseManager({ initialCourses }: { initialCourses: Course[] }) {
  const router = useRouter();
  const [courses, setCourses] = React.useState(initialCourses);
  const [name, setName] = React.useState("");
  const [semester, setSemester] = React.useState("2026 Fall Semester");
  const [description, setDescription] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), semester, description: description || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setCourses((prev) => [...prev, data.course]);
      setName("");
      setDescription("");
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("刪除課程將一併刪除所有 Lesson，確定要繼續嗎？")) return;
    const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCourses((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/courses/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setCourses((prev) => prev.map((c) => (c.id === id ? data.course : c)));
      setEditingId(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-1">
              <Label>課程名稱</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="新課程名稱" />
            </div>
            <div className="space-y-1">
              <Label>學期</Label>
              <Input value={semester} onChange={(e) => setSemester(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>說明（選填）</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">
                <Plus className="h-4 w-4" />
                新增課程
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {courses.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
          >
            {editingId === c.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <Button size="sm" onClick={() => handleRename(c.id)}>
                  儲存
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                  取消
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-neutral-400">{c.semester}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
