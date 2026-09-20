import { nanoid } from "nanoid";
import { query, transaction } from "@/lib/db";
import type { Tag } from "@/lib/types";

export async function listTags(): Promise<(Tag & { lessonCount: number })[]> {
  const rows = await query<any>(
    `SELECT t.*, (SELECT COUNT(*) FROM tag_on_lesson tol WHERE tol.tag_id = t.id) as lesson_count
     FROM tags t ORDER BY t.name ASC`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, lessonCount: Number(r.lesson_count) }));
}

async function findOrCreateTag(
  run: (text: string, params?: unknown[]) => Promise<any[]>,
  name: string
): Promise<Tag> {
  const clean = name.trim().replace(/^#/, "");
  if (!clean) throw new Error("EMPTY_TAG");
  const rows = await run(`SELECT * FROM tags WHERE name = $1`, [clean]);
  if (rows[0]) return { id: rows[0].id, name: rows[0].name };
  const id = nanoid();
  await run(`INSERT INTO tags (id, name) VALUES ($1, $2)`, [id, clean]);
  return { id, name: clean };
}

export async function setTagsForLesson(lessonId: string, tagNames: string[]): Promise<void> {
  await transaction(async (run) => {
    await run(`DELETE FROM tag_on_lesson WHERE lesson_id = $1`, [lessonId]);
    for (const raw of tagNames) {
      const name = raw.trim().replace(/^#/, "");
      if (!name) continue;
      const tag = await findOrCreateTag(run, name);
      await run(
        `INSERT INTO tag_on_lesson (lesson_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [lessonId, tag.id]
      );
    }
  });
}

export async function getTagsForLesson(lessonId: string): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `SELECT t.name FROM tag_on_lesson tol JOIN tags t ON t.id = tol.tag_id WHERE tol.lesson_id = $1 ORDER BY t.name`,
    [lessonId]
  );
  return rows.map((r) => r.name);
}

export async function setTagsForThesisIdea(thesisIdeaId: string, tagNames: string[]): Promise<void> {
  await transaction(async (run) => {
    await run(`DELETE FROM thesis_idea_tag WHERE thesis_idea_id = $1`, [thesisIdeaId]);
    for (const raw of tagNames) {
      const name = raw.trim().replace(/^#/, "");
      if (!name) continue;
      const tag = await findOrCreateTag(run, name);
      await run(
        `INSERT INTO thesis_idea_tag (thesis_idea_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [thesisIdeaId, tag.id]
      );
    }
  });
}

export async function getTagsForThesisIdea(thesisIdeaId: string): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `SELECT t.name FROM thesis_idea_tag tit JOIN tags t ON t.id = tit.tag_id WHERE tit.thesis_idea_id = $1 ORDER BY t.name`,
    [thesisIdeaId]
  );
  return rows.map((r) => r.name);
}

export async function lessonsForTag(tagName: string) {
  return query<any>(
    `SELECT l.* FROM lessons l
     JOIN tag_on_lesson tol ON tol.lesson_id = l.id
     JOIN tags t ON t.id = tol.tag_id
     WHERE t.name = $1
     ORDER BY l.date DESC`,
    [tagName]
  );
}
