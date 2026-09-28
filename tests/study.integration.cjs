// Uses a disposable PostgreSQL schema; never edits existing course records.
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  assert = require("node:assert/strict");
require("@next/env").loadEnvConfig(process.cwd());
const ts = require("typescript"),
  { Client } = require("pg");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(
    this,
    name.startsWith("@/")
      ? path.join(process.cwd(), "src", name.slice(2))
      : name,
    ...args,
  );
};
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
(async () => {
  const admin = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await admin.connect();
  const schema = "qa_study_" + Date.now();
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = url.toString();
  let keep = false;
  try {
    const { query } = require("../src/lib/db.ts");
    const { PUT, GET } = require("../src/app/api/lessons/[id]/study/route.ts");
    const {
      POST: manual,
    } = require("../src/app/api/lessons/[id]/manual-content/route.ts");
    const { globalSearch } = require("../src/lib/repo/search.ts");
    const now = new Date().toISOString();
    await query(
      "INSERT INTO courses(id,name,created_at,updated_at) VALUES ('qa-course','測試課程',$1,$1)",
      [now],
    );
    await query(
      "INSERT INTO lessons(id,course_id,date,title,created_at,updated_at) VALUES ('qa-lesson','qa-course','2026-09-11','測試課堂',$1,$1)",
      [now],
    );
    const lines = [
      { time: "00:00", text: "需求不明確會造成返工。" },
      { time: "00:25", text: "Scrum 使用 Sprint 逐步交付成果。" },
      { time: "01:00", text: "測試 100% 覆蓋與 foo_bar 的字面搜尋。" },
    ];
    await query(
      "INSERT INTO lesson_contents(id,lesson_id,summary,transcript,updated_at) VALUES ('qa-content','qa-lesson','測試摘要',$1,$2)",
      [JSON.stringify(lines), now],
    );
    const data = {
      items: [
        {
          id: "qa-card",
          category: "concept",
          title: "敏捷交付",
          text: "以 Sprint 逐步交付成果。",
          english: "Scrum / Sprint",
          certainty: "confirmed",
          examBasis: "inferred",
          segment: 1,
          quote: lines[1].text,
          time: "00:25",
          question: "Scrum 如何交付成果？",
          answer: "以 Sprint 逐步交付成果。",
        },
      ],
      corrections: [
        {
          segment: 0,
          original: lines[0].text,
          text: "需求不明確，會造成返工。",
          reason: "調整標點",
          certainty: "pending",
        },
      ],
    };
    const context = { params: Promise.resolve({ id: "qa-lesson" }) };
    const put = (body) =>
      PUT(
        new Request("http://localhost/api/lessons/qa-lesson/study", {
          method: "PUT",
          body: JSON.stringify(body),
        }),
        context,
      );
    assert.equal(
      (await GET(new Request("http://localhost"), context)).status,
      200,
    );
    const results = await Promise.all([
      put({ data, version: 0 }),
      put({ data, version: 0 }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    assert.equal(
      (
        await put({
          data: {
            ...data,
            items: [{ ...data.items[0], quote: "Invented source" }],
          },
          version: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await put({
          data: { ...data, items: [{ ...data.items[0], time: "99:99" }] },
          version: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await put({
          data: { ...data, items: [data.items[0], data.items[0]] },
          version: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await put({
          data: {
            items: [],
            corrections: [{ ...data.corrections[0], reason: "" }],
          },
          version: 1,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await GET(new Request("http://localhost"), {
          params: Promise.resolve({ id: "missing" }),
        })
      ).status,
      404,
    );
    const raw = (
      await query(
        "SELECT transcript FROM lesson_contents WHERE lesson_id='qa-lesson'",
      )
    )[0].transcript;
    assert.equal(raw, JSON.stringify(lines));
    assert.equal(
      (
        await manual(
          new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ transcript: "Overwrite" }),
          }),
          context,
        )
      ).status,
      409,
    );
    assert.equal(
      (await query("SELECT count(*)::int AS n FROM study_revisions"))[0].n,
      1,
    );
    const matches = await globalSearch("Sprint", {
      courseId: "qa-course",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    assert.ok(
      matches.some((r) => r.href.endsWith("#segment-1") && r.time === "00:25"),
    );
    assert.ok(matches.some((r) => r.href.endsWith("#study-qa-card")));
    assert.equal(
      (await globalSearch("Sprint", { from: "2026-09-12" })).length,
      0,
    );
    assert.equal(
      (await globalSearch("Sprint", { courseId: "other" })).length,
      0,
    );
    assert.equal((await globalSearch('"sourceSegmentId"')).length, 0);
    assert.equal((await globalSearch("%")).length, 1);
    assert.equal((await globalSearch("_")).length, 1);
    console.log(
      "PASS: source snapshots, immutable originals, conflict detection, revisions, schema validation, scoped search, timestamp links, literal wildcards.",
    );
    if (process.argv.includes("--keep")) {
      fs.writeFileSync(
        "/private/tmp/research-notes-qa-env.json",
        JSON.stringify({ connectionString: url.toString(), schema }),
        { mode: 0o600 },
      );
      keep = true;
      console.log("Disposable QA schema retained for browser verification.");
    }
  } finally {
    await global.__pgPool?.end();
    if (!keep) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
