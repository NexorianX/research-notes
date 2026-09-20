#!/usr/bin/env node
/**
 * Seed script — creates the 3 courses from the spec and one Lesson per
 * course-recording share URL the user has already provided, dated as given.
 *
 * IMPORTANT: this script does NOT fabricate any Summary / Transcript /
 * Mind Map content. Every seeded lesson's content is left empty with
 * importStatus = "FAILED" (shown in the UI as "匯入失敗") exactly as the
 * spec requires — real content only ever comes from an actual import at
 * creation time, or from pasting/uploading it manually afterward (there
 * is no automatic re-fetch), never from this seed.
 *
 * Requires DATABASE_URL (Postgres) in the environment. Safe to re-run:
 * it skips any (courseId, sourceUrl) pair that already exists.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/seed.cjs
 */
const crypto = require("crypto");
const { Client } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, semester TEXT, color TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    week INTEGER, date TEXT NOT NULL, title TEXT NOT NULL, duration TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
  CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date);
  CREATE TABLE IF NOT EXISTS lesson_sources (
    id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'manual', source_url TEXT, external_id TEXT,
    import_status TEXT NOT NULL DEFAULT 'MANUAL', imported_at TEXT, raw_data TEXT, error_message TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lesson_contents (
    id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    summary TEXT, transcript TEXT, mind_map TEXT, audio_url TEXT, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notes_lesson ON notes(lesson_id);
  CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
  CREATE TABLE IF NOT EXISTS tag_on_lesson (
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lesson_id, tag_id)
  );
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS review_status (
    id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'NOT_REVIEWED', updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS thesis_ideas (
    id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'manual', source_text TEXT, content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_thesis_lesson ON thesis_ideas(lesson_id);
  CREATE TABLE IF NOT EXISTS thesis_idea_tag (
    thesis_idea_id TEXT NOT NULL REFERENCES thesis_ideas(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (thesis_idea_id, tag_id)
  );
`;

async function getOrCreateCourse(name, semester) {
  const existing = await client.query(`SELECT * FROM courses WHERE name = $1`, [name]);
  if (existing.rows[0]) return existing.rows[0];
  const cid = id();
  const ts = now();
  await client.query(
    `INSERT INTO courses (id, name, description, semester, color, created_at, updated_at)
     VALUES ($1, $2, NULL, $3, NULL, $4, $5)`,
    [cid, name, semester, ts, ts]
  );
  return { id: cid, name };
}

async function lessonExists(courseId, sourceUrl) {
  const r = await client.query(
    `SELECT l.id FROM lessons l
     JOIN lesson_sources s ON s.lesson_id = l.id
     WHERE l.course_id = $1 AND s.source_url = $2`,
    [courseId, sourceUrl]
  );
  return !!r.rows[0];
}

async function createLesson(courseId, date, title, sourceUrl, externalId) {
  const lid = id();
  const ts = now();
  await client.query(
    `INSERT INTO lessons (id, course_id, week, date, title, duration, created_at, updated_at)
     VALUES ($1, $2, NULL, $3, $4, NULL, $5, $6)`,
    [lid, courseId, date, title, ts, ts]
  );

  await client.query(
    `INSERT INTO lesson_sources
       (id, lesson_id, provider, source_url, external_id, import_status, imported_at, raw_data, error_message, created_at, updated_at)
     VALUES ($1, $2, 'doway', $3, $4, 'FAILED', NULL, NULL, $5, $6, $7)`,
    [
      id(),
      lid,
      sourceUrl,
      externalId,
      "課程錄音內容目前無法自動讀取。原始連結已保存，課程已成功建立。你可以手動貼上逐字稿/摘要，或開啟原始頁面查看。",
      ts,
      ts,
    ]
  );

  await client.query(
    `INSERT INTO review_status (id, lesson_id, status, updated_at) VALUES ($1, $2, 'NOT_REVIEWED', $3)`,
    [id(), lid, ts]
  );

  await client.query(
    `INSERT INTO notes (id, lesson_id, content, created_at, updated_at) VALUES ($1, $2, '', $3, $4)`,
    [id(), lid, ts, ts]
  );

  return lid;
}

const SEMESTER = "2026 Fall Semester";

const PLAN = [
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

async function main() {
  await client.connect();
  await client.query(SCHEMA_SQL);

  let created = 0;
  let skipped = 0;

  for (const group of PLAN) {
    const course = await getOrCreateCourse(group.course, SEMESTER);
    const byDate = new Map();
    for (const item of group.items) {
      if (await lessonExists(course.id, item.url)) {
        skipped++;
        continue;
      }
      const match = item.url.match(/\/share\/([A-Za-z0-9_-]+)/);
      const externalId = match ? match[1] : "";
      const n = (byDate.get(item.date) ?? 0) + 1;
      byDate.set(item.date, n);
      const title = n === 1 ? `${group.course} ${item.date}` : `${group.course} ${item.date} (${n})`;
      await createLesson(course.id, item.date, title, item.url, externalId);
      created++;
    }
  }

  console.log(`Seed complete: ${created} lesson(s) created, ${skipped} already existed.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
