import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";
import type { ReviewStatusValue } from "@/lib/types";

const VALID: ReviewStatusValue[] = [
  "NOT_REVIEWED",
  "REVIEWED",
  "NEED_REVIEW",
  "EXAM_FOCUS",
];

export async function getReviewStatus(lessonId: string): Promise<ReviewStatusValue> {
  const row = await queryOne<{ status: ReviewStatusValue }>(
    `SELECT status FROM review_status WHERE lesson_id = $1`,
    [lessonId]
  );
  return row?.status ?? "NOT_REVIEWED";
}

export async function setReviewStatus(
  lessonId: string,
  status: ReviewStatusValue
): Promise<ReviewStatusValue> {
  if (!VALID.includes(status)) throw new Error("INVALID_STATUS");
  const now = new Date().toISOString();
  const existing = await queryOne(`SELECT id FROM review_status WHERE lesson_id = $1`, [lessonId]);
  if (existing) {
    await query(`UPDATE review_status SET status = $1, updated_at = $2 WHERE lesson_id = $3`, [
      status,
      now,
      lessonId,
    ]);
  } else {
    await query(
      `INSERT INTO review_status (id, lesson_id, status, updated_at) VALUES ($1, $2, $3, $4)`,
      [nanoid(), lessonId, status, now]
    );
  }
  return status;
}
