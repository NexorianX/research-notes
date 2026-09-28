import { z } from "zod";
import { getLessonContent, getLesson } from "@/lib/repo/lessons";
import { getStudy, saveStudy } from "@/lib/repo/study";
import { studySchema, validateSources } from "@/lib/study";
const schema = z.object({
  data: studySchema,
  version: z.number().int().nonnegative(),
});
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getLesson(id)))
    return Response.json({ error: "找不到課程" }, { status: 404 });
  return Response.json(await getStudy(id));
}
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getLesson(id)))
    return Response.json({ error: "找不到課程" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "請檢查必填內容及來源段落" },
      { status: 400 },
    );
  const content = await getLessonContent(id);
  if (!validateSources(parsed.data.data, content?.transcript ?? []))
    return Response.json(
      { error: "來源段落已變更，請重新載入並核對引用" },
      { status: 409 },
    );
  const result = await saveStudy(id, parsed.data.data, parsed.data.version);
  return result
    ? Response.json(result)
    : Response.json(
        { error: "另一個頁面已更新筆記；請先複製未儲存內容，再重新載入" },
        { status: 409 },
      );
}
