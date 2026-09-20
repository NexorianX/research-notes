import { Pool, type QueryResultRow } from "pg";

// Persistent database: Postgres (Supabase in production).
//
// The original spec called for Supabase PostgreSQL — this is that.
// (An earlier iteration of this app used SQLite for a sandboxed
// environment that had no route to any external Postgres instance;
// once deploying for real, on Vercel, Postgres is required anyway
// because Vercel's serverless functions have an ephemeral, per-instance
// filesystem — a SQLite file would not persist or be shared across
// invocations.)

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __pgMigrated: Promise<void> | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Point it at your Supabase Postgres connection string."
    );
  }
  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
    max: 5,
  });
}

function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = createPool();
  }
  return global.__pgPool;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    semester TEXT,
    color TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    week INTEGER,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    duration TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
  CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date);

  CREATE TABLE IF NOT EXISTS lesson_sources (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'manual',
    source_url TEXT,
    external_id TEXT,
    import_status TEXT NOT NULL DEFAULT 'MANUAL',
    imported_at TEXT,
    raw_data TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lesson_contents (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    summary TEXT,
    transcript TEXT,
    mind_map TEXT,
    audio_url TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notes_lesson ON notes(lesson_id);

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS tag_on_lesson (
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lesson_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS review_status (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS thesis_ideas (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'manual',
    source_text TEXT,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_thesis_lesson ON thesis_ideas(lesson_id);

  CREATE TABLE IF NOT EXISTS thesis_idea_tag (
    thesis_idea_id TEXT NOT NULL REFERENCES thesis_ideas(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (thesis_idea_id, tag_id)
  );
`;

// One-time rename for databases created before the "sync" -> "import"
// terminology change: URL import is a one-time extraction, not an
// ongoing sync, so `sync_status`/`last_synced_at` became
// `import_status`/`imported_at`, and the old SYNCING/SYNCED values became
// IMPORTING/IMPORTED. Guarded so it's a no-op on a fresh database (which
// is created directly with the new column names above) and safe to run
// on every cold start.
const RENAME_SYNC_COLUMNS_SQL = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'lesson_sources' AND column_name = 'sync_status'
    ) THEN
      ALTER TABLE lesson_sources RENAME COLUMN sync_status TO import_status;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'lesson_sources' AND column_name = 'last_synced_at'
    ) THEN
      ALTER TABLE lesson_sources RENAME COLUMN last_synced_at TO imported_at;
    END IF;
  END $$;

  UPDATE lesson_sources SET import_status = 'IMPORTING' WHERE import_status = 'SYNCING';
  UPDATE lesson_sources SET import_status = 'IMPORTED' WHERE import_status = 'SYNCED';
`;

async function ensureMigrated(): Promise<void> {
  if (!global.__pgMigrated) {
    global.__pgMigrated = getPool()
      .query(SCHEMA_SQL)
      .then(() => getPool().query(RENAME_SYNC_COLUMNS_SQL))
      .then(() => undefined);
  }
  return global.__pgMigrated;
}

/**
 * Run a parameterized query. Uses `$1, $2, ...` placeholders (node-postgres
 * convention), NOT the `?` placeholders SQLite uses — every call site in
 * src/lib/repo/*.ts was written against this.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureMigrated();
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

/** Convenience: first row or null. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run several statements as one transaction (all-or-nothing). */
export async function transaction<T>(
  fn: (run: typeof query) => Promise<T>
): Promise<T> {
  await ensureMigrated();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const run = (async (text: string, params: unknown[] = []) => {
      const result = await client.query(text, params);
      return result.rows;
    }) as typeof query;
    const value = await fn(run);
    await client.query("COMMIT");
    return value;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
