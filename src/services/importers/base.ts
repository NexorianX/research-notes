import type { NormalizedLessonSource } from "@/lib/types";

export type { NormalizedLessonSource } from "@/lib/types";

/**
 * Every source integration (a course-recording link today; YouTube / Google
 * Drive / Notion / PDF / other recorders in the future) implements this
 * interface. The rest of the app only ever talks to `Importer`, never to a
 * specific provider's API shape — that isolation is what lets us swap or
 * add providers without touching Lesson/Course logic.
 */
export interface Importer {
  /** Provider key, e.g. "doway" (internal only — never shown in the UI). */
  readonly provider: string;

  /** Does this URL belong to this provider? */
  detect(url: string): boolean;

  /** Pull the provider-specific id out of the URL (e.g. the share id). */
  extractId(url: string): string | null;

  /**
   * Fetch + normalize in one step, once, at import time. This is a
   * one-time extraction/conversion — not an ongoing sync — so it MUST NOT
   * throw for ordinary failure modes (network error, anti-bot, auth wall,
   * page-structure change): those are reported through
   * `importStatus: "FAILED"` / `errorMessage` on the returned object so
   * the caller can still create the Lesson and Source record. Throwing is
   * reserved for programmer errors (e.g. calling fetch() with a URL that
   * failed detect()). There is no automatic re-fetch afterward — a
   * PARTIAL or FAILED result can only be completed by pasting or
   * uploading content manually.
   */
  fetchAndNormalize(url: string): Promise<NormalizedLessonSource>;
}

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}
