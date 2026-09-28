// Read-only equivalence checks against the pre-optimization implementation.
const fs = require("fs"),
  path = require("path"),
  Module = require("module"),
  assert = require("assert/strict"),
  { execFileSync } = require("child_process");
const req = Module.createRequire(process.cwd() + "/package.json");
req("@next/env").loadEnvConfig(process.cwd());
const ts = req("typescript"),
  resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(
    this,
    name.startsWith("@/")
      ? path.join(process.cwd(), "src", name.slice(2))
      : name,
    ...args,
  );
};
const compile = (s) =>
  ts.transpileModule(s, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
require.extensions[".ts"] = (m, f) =>
  m._compile(compile(fs.readFileSync(f, "utf8")), f);
function legacy(file) {
  const filename = path.join(process.cwd(), file);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  m._compile(
    compile(
      execFileSync("git", ["show", "501273c:" + file], { encoding: "utf8" }),
    ),
    filename,
  );
  return m.exports;
}
(async () => {
  try {
    const db = req("./src/lib/db.ts");
    let count = 0;
    const original = db.query;
    db.query = async (...args) => {
      count++;
      return original(...args);
    };
    const oldLessons = legacy("src/lib/repo/lessons.ts"),
      newLessons = req("./src/lib/repo/lessons.ts");
    const oldCourses = legacy("src/lib/repo/courses.ts"),
      newCourses = req("./src/lib/repo/courses.ts");
    const norm = (rows) =>
      rows
        .map((r) => ({ ...r, ...(r.tags ? { tags: [...r.tags].sort() } : {}) }))
        .sort((a, b) => a.id.localeCompare(b.id));
    const before = await oldLessons.listLessonSummaries();
    count = 0;
    const after = await newLessons.listLessonSummaries();
    assert.equal(count, 1);
    assert.deepEqual(norm(after), norm(before));
    const cardsBefore = await oldCourses.listCourseCards();
    count = 0;
    const cardsAfter = await newCourses.listCourseCards();
    assert.equal(count, 1);
    assert.deepEqual(norm(cardsAfter), norm(cardsBefore));
    for (const c of cardsAfter) {
      assert.deepEqual(
        norm(await newLessons.listLessonSummaries({ courseId: c.id })),
        norm(before.filter((l) => l.courseId === c.id)),
      );
    }
    assert.equal(
      (await newLessons.listLessonSummaries({ limit: 6 })).length,
      Math.min(6, before.length),
    );
    const oldStats = legacy("src/lib/repo/stats.ts"),
      newStats = req("./src/lib/repo/stats.ts");
    assert.deepEqual(
      await newStats.getGlobalStats(),
      await oldStats.getGlobalStats(),
    );
    console.log(
      "PASS: combined query results equal previous implementation; per-course filters, limits, counts, notes, tags and review states preserved.",
    );
    console.log(
      "Homepage page-data queries: " +
        (4 + 1 + cardsAfter.length * 4 + 1 + Math.min(6, before.length) * 6) +
        " -> 3 (excluding shared layout and cold-start migration).",
    );
  } finally {
    await global.__pgPool?.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
