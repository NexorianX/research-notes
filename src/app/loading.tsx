export default function Loading() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-8"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-neutral-500">正在載入課程內容…</p>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        <div className="h-8 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-neutral-100 dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  );
}
