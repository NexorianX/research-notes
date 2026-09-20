"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteThesisButton({ id }: { id: string }) {
  const router = useRouter();
  async function handleDelete() {
    await fetch(`/api/thesis-ideas/${id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} title="刪除">
      <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500" />
    </Button>
  );
}
