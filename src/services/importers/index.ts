import type { Importer } from "@/services/importers/base";
import { dowayImporter } from "@/services/importers/doway";
import { manualImporter } from "@/services/importers/manual";

const importers: Importer[] = [dowayImporter, manualImporter];

/** URL -> Importer, e.g. detects a dowayai.com/share/{id} link. */
export function detectProvider(url: string): Importer | null {
  return importers.find((imp) => imp.detect(url)) ?? null;
}

export function getImporter(provider: string): Importer | null {
  return importers.find((imp) => imp.provider === provider) ?? null;
}

export { dowayImporter, manualImporter };
export type { Importer };
