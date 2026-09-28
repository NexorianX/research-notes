"use client";
import { useEffect, useState } from "react";
import { CATEGORIES, type StudyDocument, type StudyItem } from "@/lib/study";
import type { TranscriptLine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  lessonId: string;
  doc: StudyDocument;
  setDoc: (doc: StudyDocument) => void;
  lines: TranscriptLine[];
  mode: "study" | "corrections" | "practice";
};
const field =
  "block w-full rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-700";
export function StudyWorkspace({ lessonId, doc, setDoc, lines, mode }: Props) {
  const [segment, setSegment] = useState(0);
  const [editing, setEditing] = useState<StudyItem | null>(null);
  const [corrected, setCorrected] = useState(
    doc.data.corrections.find((c) => c.segment === 0)?.text ??
      lines[0]?.text ??
      "",
  );
  const [reason, setReason] = useState(
    doc.data.corrections.find((c) => c.segment === 0)?.reason ?? "",
  );
  const [certainty, setCertainty] = useState<"pending" | "confirmed">(
    doc.data.corrections.find((c) => c.segment === 0)?.certainty ?? "pending",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, string>>({});
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  async function save(data: StudyDocument["data"]) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/lessons/${lessonId}/study`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data, version: doc.version }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "儲存失敗");
      setDoc(body);
      setDirty(false);
      setEditing(null);
      setMessage("已儲存，原始逐字稿維持不變");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "儲存失敗，請保留內容後重試");
    } finally {
      setBusy(false);
    }
  }
  function selectSegment(value: number) {
    if (dirty && !window.confirm("放棄此段未儲存的修改？")) return;
    setDirty(false);
    setSegment(value);
    const previous = doc.data.corrections.find((c) => c.segment === value);
    setCorrected(previous?.text ?? lines[value]?.text ?? "");
    setReason(previous?.reason ?? "");
    setCertainty(previous?.certainty ?? "pending");
  }
  function createItem() {
    const line = lines[segment];
    if (!line) return;
    setEditing({
      id: crypto.randomUUID(),
      category: "concept",
      title: "",
      text: "",
      english: "",
      certainty: "pending",
      examBasis: "inferred",
      segment,
      quote: line.text,
      time: line.time ?? "",
      question: "",
      answer: "",
    });
  }
  const sourceSelector = (
    <label className="block space-y-1">
      引用逐字稿段落
      <select
        aria-label="引用逐字稿段落"
        className={field}
        value={segment}
        onChange={(e) => selectSegment(Number(e.target.value))}
      >
        {lines.map((line, i) => (
          <option key={i} value={i}>
            {line.time || `第 ${i + 1} 段`} · {line.text.slice(0, 55)}
          </option>
        ))}
      </select>
    </label>
  );
  if (mode === "practice") {
    const verified = doc.data.items.filter((i) => i.certainty === "confirmed");
    const questions = verified.filter(
      (i) => i.question.trim() && i.answer.trim(),
    );
    return (
      <div className="space-y-5 text-sm">
        <h2 className="font-semibold text-lg">快速複習</h2>
        <p className="text-neutral-500">
          取自已核對的學習筆記；未確認內容不列入。自評僅保留於本次練習。
        </p>
        {verified.length === 0 && (
          <p>先在「學習筆記」新增重點、核對來源，再開始複習。</p>
        )}
        <ul className="list-disc pl-5 space-y-2">
          {verified.slice(0, 5).map((i) => (
            <li key={i.id}>
              <a className="underline" href={`?tab=study#study-${i.id}`}>
                {i.title}
              </a>
              ：{i.text.slice(0, 160)}
              {i.text.length > 160 ? "…" : ""}
            </li>
          ))}
        </ul>
        {verified.length > 5 && (
          <a className="underline" href="?tab=study">
            查看全部 {verified.length} 則已核對筆記
          </a>
        )}
        <h2 className="font-semibold text-lg">自我測驗</h2>
        <p>
          已自評 {Object.keys(ratings).length} / {questions.length} 題 · 已理解{" "}
          {Object.values(ratings).filter((r) => r === "understood").length} 題
        </p>
        {!questions.length && (
          <p>在已核對筆記中填入「練習題」與「參考答案」，這裡就會出現題目。</p>
        )}
        {questions.map((i, n) => (
          <section key={i.id} className="rounded-lg border p-4 space-y-3">
            <h3>
              {n + 1}. {i.question}
            </h3>
            <p className="text-xs text-neutral-500">
              {i.category === "exam"
                ? i.examBasis === "teacher"
                  ? "教師明示考點（人工核對）"
                  : "個人推測考點，非教師承諾"
                : "自訂練習題，非教師考題"}
            </p>
            <Textarea
              aria-label={`第 ${n + 1} 題作答`}
              placeholder="先寫下你的答案"
              value={answers[i.id] ?? ""}
              onChange={(e) =>
                setAnswers({ ...answers, [i.id]: e.target.value })
              }
            />
            <Button
              variant="outline"
              onClick={() => setShown({ ...shown, [i.id]: !shown[i.id] })}
            >
              {shown[i.id] ? "隱藏答案" : "查看參考答案"}
            </Button>
            {shown[i.id] && (
              <div className="space-y-3">
                <p className="whitespace-pre-wrap">{i.answer}</p>
                <a
                  className="underline"
                  href={`?tab=transcript#segment-${i.segment}`}
                >
                  回查原文 {i.time || `第 ${i.segment + 1} 段`}
                </a>
                <div className="flex gap-2">
                  <Button
                    variant={
                      ratings[i.id] === "understood" ? "default" : "outline"
                    }
                    onClick={() =>
                      setRatings({ ...ratings, [i.id]: "understood" })
                    }
                  >
                    已理解
                  </Button>
                  <Button
                    variant={ratings[i.id] === "review" ? "default" : "outline"}
                    onClick={() => setRatings({ ...ratings, [i.id]: "review" })}
                  >
                    需要再複習
                  </Button>
                </div>
              </div>
            )}
          </section>
        ))}
        {!!questions.length && (
          <Button
            variant="outline"
            onClick={() => {
              setAnswers({});
              setShown({});
              setRatings({});
            }}
          >
            重新練習
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4 text-sm">
      <p className="text-neutral-500">
        {mode === "corrections"
          ? "校訂文字另存，原文保留供比對。僅修正可確認的錯字與語句；不確定時保留「待確認」。"
          : "依逐字稿建立學習筆記。摘要僅供輔助，教師強調與考點需核對原文；未核對前標記「待確認」。"}
      </p>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {!lines.length ? (
        <p>尚無逐字稿，請先完成匯入或至「來源與匯入」補件。</p>
      ) : mode === "corrections" ? (
        <>
          {sourceSelector}
          <blockquote className="border-l-2 pl-3 whitespace-pre-wrap">
            {lines[segment]?.text}
          </blockquote>
          <label className="block">
            校訂文字
            <Textarea
              aria-label="校訂文字"
              rows={6}
              value={corrected}
              onChange={(e) => {
                setCorrected(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <label className="block">
            修正依據（選填）
            <Input
              aria-label="修正依據"
              placeholder="例如：回聽確認專有名詞；僅刪除重複贅字"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <label className="block">
            核對狀態
            <select
              className={field}
              value={certainty}
              onChange={(e) => {
                setCertainty(e.target.value as typeof certainty);
                setDirty(true);
              }}
            >
              <option value="pending">待確認</option>
              <option value="confirmed">已核對原文／錄音</option>
            </select>
          </label>
          <Button
            disabled={busy || !corrected.trim()}
            onClick={() =>
              save({
                ...doc.data,
                corrections: [
                  ...doc.data.corrections.filter((c) => c.segment !== segment),
                  {
                    segment,
                    original: lines[segment].text,
                    text: corrected,
                    reason,
                    certainty,
                  },
                ],
              })
            }
          >
            {busy ? "儲存中…" : "儲存校訂"}
          </Button>
          <h3 className="font-semibold">
            已保存的校訂（{doc.data.corrections.length}）
          </h3>
          {doc.data.corrections.map((c) => (
            <section
              id={`correction-${c.segment}`}
              key={c.segment}
              className="border rounded-md p-3 space-y-2"
            >
              <a
                href={`?tab=transcript#segment-${c.segment}`}
                className="underline"
              >
                {lines[c.segment]?.time || `第 ${c.segment + 1} 段`}
              </a>
              <span>
                {" "}
                · {c.certainty === "confirmed" ? "已核對" : "待確認"}
              </span>
              <p className="whitespace-pre-wrap">{c.text}</p>
              {c.reason && <p className="text-neutral-500">修正依據：{c.reason}</p>}
              <details>
                <summary>比對原文</summary>
                <p>{c.original}</p>
              </details>
              <Button
                variant="outline"
                onClick={() => selectSegment(c.segment)}
              >
                編輯此段
              </Button>
            </section>
          ))}
        </>
      ) : (
        <>
          {!editing && (
            <>
              {sourceSelector}
              <Button onClick={createItem}>新增學習筆記</Button>
            </>
          )}
          {editing && (
            <form
              className="rounded-lg border p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save({
                  ...doc.data,
                  items: [
                    ...doc.data.items.filter((i) => i.id !== editing.id),
                    editing,
                  ],
                });
              }}
              onChange={() => setDirty(true)}
            >
              <label className="block">
                分類
                <select
                  aria-label="筆記分類"
                  className={field}
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      category: e.target.value as StudyItem["category"],
                    })
                  }
                >
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                標題
                <Input
                  required
                  maxLength={200}
                  aria-label="筆記標題"
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </label>
              <label className="block">
                整理內容／簡短定義
                <Textarea
                  required
                  rows={5}
                  maxLength={8000}
                  aria-label="整理內容"
                  value={editing.text}
                  onChange={(e) =>
                    setEditing({ ...editing, text: e.target.value })
                  }
                />
              </label>
              <label className="block">
                英文原文與縮寫（選填）
                <Input
                  aria-label="英文原文與縮寫"
                  value={editing.english}
                  onChange={(e) =>
                    setEditing({ ...editing, english: e.target.value })
                  }
                />
              </label>
              <label className="block">
                核對狀態
                <select
                  aria-label="筆記核對狀態"
                  className={field}
                  value={editing.certainty}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      certainty: e.target.value as StudyItem["certainty"],
                    })
                  }
                >
                  <option value="pending">待確認</option>
                  <option value="confirmed">已核對原文／錄音</option>
                </select>
              </label>
              {editing.category === "exam" && (
                <label className="block">
                  考點依據
                  <select
                    className={field}
                    value={editing.examBasis}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        examBasis: e.target.value as StudyItem["examBasis"],
                      })
                    }
                  >
                    <option value="inferred">個人推測</option>
                    <option value="teacher">教師明示（需有原文佐證）</option>
                  </select>
                </label>
              )}
              <details open>
                <summary>
                  來源 {editing.time || `第 ${editing.segment + 1} 段`}
                </summary>
                <blockquote className="max-h-48 overflow-auto border-l-2 pl-3 mt-2">
                  {editing.quote}
                </blockquote>
              </details>
              <label className="block">
                練習題（選填）
                <Input
                  aria-label="練習題"
                  value={editing.question}
                  onChange={(e) =>
                    setEditing({ ...editing, question: e.target.value })
                  }
                />
              </label>
              <label className="block">
                參考答案（以本段來源為依據）
                <Textarea
                  aria-label="參考答案"
                  value={editing.answer}
                  onChange={(e) =>
                    setEditing({ ...editing, answer: e.target.value })
                  }
                />
              </label>
              <p className="text-xs text-neutral-500">
                填寫題目和答案，並核對筆記後，就會加入「複習測驗」。
              </p>
              <div className="flex gap-2">
                <Button disabled={busy}>{busy ? "儲存中…" : "儲存筆記"}</Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (!dirty || window.confirm("放棄未儲存的修改？")) {
                      setEditing(null);
                      setDirty(false);
                    }
                  }}
                >
                  取消編輯
                </Button>
              </div>
            </form>
          )}
          <label className="block">
            篩選分類
            <select
              className={field}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">全部分類</option>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {Object.entries(CATEGORIES)
            .filter(([k]) => !filter || filter === k)
            .map(([key, label]) => (
              <section key={key} className="space-y-3">
                <h3 className="font-semibold">{label}</h3>
                {!doc.data.items.some((i) => i.category === key) && (
                  <p className="text-neutral-400">尚未整理</p>
                )}
                {doc.data.items
                  .filter((i) => i.category === key)
                  .map((i) => (
                    <article
                      id={`study-${i.id}`}
                      key={i.id}
                      className="scroll-mt-6 rounded-md border p-4 space-y-2 target:ring-2 target:ring-amber-400"
                    >
                      <p className="text-xs text-neutral-500">
                        {i.certainty === "confirmed" ? "已核對" : "待確認"}
                        {i.category === "exam" &&
                          ` · ${i.examBasis === "teacher" ? "教師明示" : "個人推測"}`}
                      </p>
                      <h4 className="font-semibold">
                        {i.title}
                        {i.english && `（${i.english}）`}
                      </h4>
                      <p className="whitespace-pre-wrap">{i.text}</p>
                      <a
                        className="underline"
                        href={`?tab=transcript#segment-${i.segment}`}
                      >
                        查看原文 {i.time || `第 ${i.segment + 1} 段`}
                      </a>
                      <details>
                        <summary>引用原文</summary>
                        <blockquote>{i.quote}</blockquote>
                      </details>
                      <Button
                        variant="outline"
                        disabled={!!editing}
                        onClick={() => setEditing(i)}
                      >
                        編輯筆記
                      </Button>
                    </article>
                  ))}
              </section>
            ))}
        </>
      )}
    </div>
  );
}
