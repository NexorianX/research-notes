import { NextResponse } from "next/server";
import crypto from "crypto";
import { query, transaction } from "@/lib/db";

export const dynamic = "force-dynamic";
// Seeding 11 lessons is ~44 sequential inserts over a pooled connection;
// the Hobby-plan default of 10s isn't enough. 60s is the Hobby-plan max.
export const maxDuration = 60;

/**
 * One-time admin seeding endpoint.
 *
 * Why this exists as an HTTP route instead of a local script run against
 * production: the environment used to build/deploy this app can reach
 * Supabase only over HTTPS (GitHub, npm, Vercel), not over a raw Postgres
 * TCP connection — so seeding has to happen from inside Vercel's own
 * runtime, which *does* have a normal route to Supabase. Hitting this URL
 * once after deploy has the same effect as running `npm run seed` locally.
 *
 * Protected by SEED_SECRET so it can't be triggered by a random visitor.
 * Call it as: GET/POST /api/admin/seed?secret=<SEED_SECRET>
 *
 * Does NOT fabricate any Summary / Transcript / Mind Map content — every
 * seeded lesson's content is left empty with importStatus = "FAILED"
 * (shown in the UI as "匯入失敗"), exactly like scripts/seed.cjs.
 * Safe to call more than once: it skips any (course, source_url) pair
 * that already exists.
 */

const SEMESTER = "2026 Fall Semester";

const PLAN: { course: string; items: { date: string; url: string }[] }[] = [
  {
    course: "電子商務管理",
    items: [
      { date: "2026-09-11", url: "https://www.dowayai.com/share/27293262" },
      { date: "2026-09-11", url: "https://www.dowayai.com/share/506180842" },
      { date: "2026-09-18", url: "https://www.dowayai.com/share/26023481" },
      { date: "2026-09-18", url: "https://www.dowayai.com/share/130200275" },
      { date: "2026-09-18", url: "https://www.dowayai.com/share/328729314" },
    ],
  },
  {
    course: "電子商務資料管理",
    items: [
      { date: "2026-09-12", url: "https://www.dowayai.com/share/1047205938" },
      { date: "2026-09-12", url: "https://www.dowayai.com/share/157575330" },
      { date: "2026-09-19", url: "https://www.dowayai.com/share/268611216" },
      { date: "2026-09-19", url: "https://www.dowayai.com/share/458355875" },
    ],
  },
  {
    course: "電子商務網際網路技術",
    items: [
      { date: "2026-09-19", url: "https://www.dowayai.com/share/462536151" },
      { date: "2026-09-19", url: "https://www.dowayai.com/share/678275577" },
    ],
  },
];

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

type Run = typeof query;

async function getOrCreateCourse(run: Run, name: string, semester: string) {
  const existing = await run<{ id: string; name: string }>(
    `SELECT id, name FROM courses WHERE name = $1`,
    [name]
  );
  if (existing[0]) return existing[0];
  const cid = id();
  const ts = now();
  await run(
    `INSERT INTO courses (id, name, description, semester, color, created_at, updated_at)
     VALUES ($1, $2, NULL, $3, NULL, $4, $5)`,
    [cid, name, semester, ts, ts]
  );
  return { id: cid, name };
}

async function lessonExists(run: Run, courseId: string, sourceUrl: string) {
  const r = await run<{ id: string }>(
    `SELECT l.id FROM lessons l
     JOIN lesson_sources s ON s.lesson_id = l.id
     WHERE l.course_id = $1 AND s.source_url = $2`,
    [courseId, sourceUrl]
  );
  return !!r[0];
}

async function createLesson(
  run: Run,
  courseId: string,
  date: string,
  title: string,
  sourceUrl: string,
  externalId: string
) {
  const lid = id();
  const ts = now();
  await run(
    `INSERT INTO lessons (id, course_id, week, date, title, duration, created_at, updated_at)
     VALUES ($1, $2, NULL, $3, $4, NULL, $5, $6)`,
    [lid, courseId, date, title, ts, ts]
  );
  await run(
    `INSERT INTO lesson_sources
       (id, lesson_id, provider, source_url, external_id, import_status, imported_at, raw_data, error_message, created_at, updated_at)
     VALUES ($1, $2, 'doway', $3, $4, 'FAILED', NULL, NULL, $5, $6, $7)`,
    [
      id(),
      lid,
      sourceUrl,
      externalId,
      "課程錄音內容目前無法自動讀取。原始連結已保存,課程已成功建立。你可以手動貼上逐字稿/摘要,或開啟原始頁面查看。",
      ts,
      ts,
    ]
  );
  await run(
    `INSERT INTO review_status (id, lesson_id, status, updated_at) VALUES ($1, $2, 'NOT_REVIEWED', $3)`,
    [id(), lid, ts]
  );
  await run(
    `INSERT INTO notes (id, lesson_id, content, created_at, updated_at) VALUES ($1, $2, '', $3, $4)`,
    [id(), lid, ts, ts]
  );
  return lid;
}

async function runSeed() {
  return transaction(async (run) => {
  let created = 0;
  let skipped = 0;
  for (const group of PLAN) {
    const course = await getOrCreateCourse(run, group.course, SEMESTER);
    const byDate = new Map<string, number>();
    for (const item of group.items) {
      if (await lessonExists(run, course.id, item.url)) {
        skipped++;
        continue;
      }
      const match = item.url.match(/\/share\/([A-Za-z0-9_-]+)/);
      const externalId = match ? match[1] : "";
      const n = (byDate.get(item.date) ?? 0) + 1;
      byDate.set(item.date, n);
      const title =
        n === 1
          ? `${group.course} ${item.date}`
          : `${group.course} ${item.date} (${n})`;
      await createLesson(run, course.id, item.date, title, item.url, externalId);
      created++;
    }
  }
  return { created, skipped };
  });
}

async function handle(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.SEED_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "SEED_SECRET is not configured on the server." },
      { status: 500 }
    );
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (url.searchParams.get("debug") === "1") {
      const courses = await query<{ id: string; name: string }>(
        `SELECT id, name FROM courses`
      );
      const lessons = await query<{ id: string; title: string; course_id: string }>(
        `SELECT id, title, course_id FROM lessons`
      );
      return NextResponse.json({
        ok: true,
        databaseUrlHost: (process.env.DATABASE_URL || "").split("@")[1] ?? null,
        courseCount: courses.length,
        lessonCount: lessons.length,
        courses,
        lessons,
      });
    }
    const result = await runSeed();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
