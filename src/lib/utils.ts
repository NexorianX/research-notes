import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const REVIEW_LABEL: Record<string, string> = {
  NOT_REVIEWED: "尚未複習",
  REVIEWED: "已複習",
  NEED_REVIEW: "需要複習",
  EXAM_FOCUS: "考試重點",
};

const REVIEW_ICON: Record<string, string> = {
  NOT_REVIEWED: "○",
  REVIEWED: "✓",
  NEED_REVIEW: "↻",
  EXAM_FOCUS: "★",
};

export function reviewLabel(status: string) {
  return REVIEW_LABEL[status] ?? status;
}
export function reviewIcon(status: string) {
  return REVIEW_ICON[status] ?? "○";
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export function formatMonthLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()} ${d.toLocaleString("en-US", { month: "long" })}`;
}

export function formatDateShort(iso: string) {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}`;
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}
