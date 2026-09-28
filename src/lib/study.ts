import { z } from "zod";

export const CATEGORIES = {
  concept: "定義與核心觀念",
  term: "專有名詞",
  example: "課堂案例",
  emphasis: "教師特別強調",
  exam: "可能考點",
  confusion: "易混淆觀念",
  further: "延伸閱讀／待查證",
} as const;
export const studyItemSchema = z.object({
  id: z.string().min(1).max(100),
  category: z.enum([
    "concept",
    "term",
    "example",
    "emphasis",
    "exam",
    "confusion",
    "further",
  ]),
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(8000),
  english: z.string().max(300).default(""),
  certainty: z.enum(["pending", "confirmed"]),
  examBasis: z.enum(["teacher", "inferred"]).default("inferred"),
  segment: z.number().int().nonnegative(),
  quote: z.string().min(1).max(20000),
  time: z.string().max(30),
  question: z.string().max(1000).default(""),
  answer: z.string().max(8000).default(""),
});
export const correctionSchema = z.object({
  segment: z.number().int().nonnegative(),
  original: z.string().min(1).max(20000),
  text: z.string().trim().min(1).max(20000),
  reason: z.string().trim().max(1000).default(""),
  certainty: z.enum(["pending", "confirmed"]),
});
export const studySchema = z.object({
  items: z.array(studyItemSchema).max(300),
  corrections: z.array(correctionSchema).max(1000),
});
export type StudyItem = z.infer<typeof studyItemSchema>;
export type StudyData = z.infer<typeof studySchema>;
export interface StudyDocument {
  data: StudyData;
  version: number;
}
export const emptyStudy = (): StudyDocument => ({
  data: { items: [], corrections: [] },
  version: 0,
});
export function validateSources(
  data: StudyData,
  lines: { text: string; time?: string }[],
) {
  if (new Set(data.items.map((i) => i.id)).size !== data.items.length)
    return false;
  if (
    new Set(data.corrections.map((i) => i.segment)).size !==
    data.corrections.length
  )
    return false;
  return (
    data.items.every(
      (i) =>
        lines[i.segment]?.text === i.quote &&
        (lines[i.segment]?.time ?? "") === i.time,
    ) && data.corrections.every((i) => lines[i.segment]?.text === i.original)
  );
}
