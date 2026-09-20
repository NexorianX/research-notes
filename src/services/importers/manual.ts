import type { Importer } from "@/services/importers/base";
import type { NormalizedLessonSource } from "@/lib/types";

/**
 * "manual" / "upload" provider: the user pastes or uploads content
 * directly instead of pointing at a course-recording URL. There is nothing to
 * fetch — normalize() is called directly by the API route with the
 * pasted text, this module just satisfies the common Importer shape
 * for anything that inspects `provider === "manual"`.
 */
export const manualImporter: Importer = {
  provider: "manual",

  detect(): boolean {
    return false; // never auto-detected from a URL; entered explicitly
  },

  extractId(): string | null {
    return null;
  },

  async fetchAndNormalize(url: string): Promise<NormalizedLessonSource> {
    return {
      provider: "manual",
      sourceUrl: url || "",
      externalId: "",
      importStatus: "MANUAL",
    };
  },
};
