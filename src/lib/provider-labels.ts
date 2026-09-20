import type { ImportStatus, LessonProvider } from "@/lib/types";

/**
 * Display labels for internal `provider` values. The database keeps the
 * raw provider key (e.g. "doway") so importer logic and future providers
 * stay easy to tell apart, but the UI never shows a vendor/brand name —
 * everything user-facing goes through this table instead.
 */
const PROVIDER_LABELS: Record<LessonProvider, string> = {
  doway: "課程錄音",
  manual: "手動輸入",
  upload: "上傳檔案",
};

export function providerLabel(provider: LessonProvider | null | undefined): string {
  if (!provider) return "未知來源";
  return PROVIDER_LABELS[provider] ?? "未知來源";
}

/** Neutral label for "open the original page" links, regardless of provider. */
export const ORIGINAL_PAGE_LABEL = "原始頁面";

/** Neutral label for the import action, regardless of provider. */
export const IMPORT_ACTION_LABEL = "匯入";

const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  IMPORTING: "匯入中",
  IMPORTED: "已匯入",
  PARTIAL: "部分匯入",
  FAILED: "匯入失敗",
  MANUAL: "手動建立",
};

export function importStatusLabel(status: ImportStatus | null | undefined): string {
  if (!status) return "尚未匯入";
  return IMPORT_STATUS_LABELS[status] ?? "尚未匯入";
}
