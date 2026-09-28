import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { transaction } from "@/lib/db";

export async function POST(request: Request) {
  const secret = process.env.SEED_SECRET;
  const actual = request.headers.get("x-seed-secret") ?? "";
  if (!secret || !timingSafeEqual(createHash("sha256").update(actual).digest(), createHash("sha256").update(secret).digest())) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  const courses = [
    ["IMA002", "電子商務管理", "blue"],
    ["IMA003", "電子商務網際網路技術", "purple"],
    ["IMA009", "電子商務資料管理", "green"],
  ];
  await transaction(async (run) => {
    await run("SELECT pg_advisory_xact_lock(729321)");
    for (const [id, name, color] of courses) {
      await run(`INSERT INTO courses (id, name, semester, color, created_at, updated_at)
        SELECT $1, $2, '2026 Fall', $3, $4, $4
        WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = $2)
        ON CONFLICT (id) DO NOTHING`, [id, name, color, new Date().toISOString()]);
    }
  });
  return NextResponse.json({ success: true, message: "三門課程已初始化；未建立虛構課堂內容。" });
}
