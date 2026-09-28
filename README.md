# Research Notes — 研究所課程筆記

Next.js / React / TypeScript / Tailwind CSS，使用 Supabase PostgreSQL（pg）。

## 本機執行

1. `npm ci`
2. 複製 `.env.example` 到 `.env.local`，設定 `DATABASE_URL` 與 `SEED_SECRET`。
3. `npm run dev`

密鑰只存本機未追蹤的環境檔或 Vercel Environment Variables。`prisma/schema.prisma` 是舊版參考文件，實際資料表由 `src/lib/db.ts` 管理。

## 匯入行為

- 一個分享連結在同一課程只擷取一次，重複提交直接回傳既有課堂。
- 預設課堂只保存網址，狀態為 `PENDING`（待首次匯入）；首次提交會填入原課堂，不另建重複紀錄。真正執行後的 `FAILED` / `PARTIAL` / `IMPORTED` 不會重新擷取。
- 擷取前先保存課堂與來源，失敗後保留資料，僅能手動補件。
- 不存在重新擷取 API、按鈕或背景同步工作。
- 原始摘要、逐字稿與思維圖獨立於個人筆記保存。
- 資料庫使用 `import_status` / `imported_at`，並相容舊版欄位遷移。
- 優先使用分享頁公開資料介面，保存原始 Markdown、逐字稿起訖時間與來源段落 ID。來源思維圖使用摘要 Markdown，網站保存為可收合的樹狀結構。
- 自動擷取依公開頁面資料而定。動態渲染需要執行環境具有可用的 Playwright Chromium；Vercel 未配置瀏覽器執行檔時會保留課堂並提供手動補件，不宣稱擷取成功。
- 外部音檔 URL 目前未複製到自有 Storage，來源失效後不能保證播放。

## 部署

GitHub repository: `NexorianX/research-notes`，匯入 Vercel，使用 Next.js 預設並設定：

- `DATABASE_URL`：Supabase PostgreSQL pooler 連線字串，密碼須 URL 編碼。
- `SEED_SECRET`：初始化端點密鑰，只能伺服器端使用。

首次資料庫存取建立缺少的資料表。`POST /api/seed` 需提供 `x-seed-secret` 標頭，只初始化三門課程，可重複呼叫，不加入虛構課堂或內容。

依使用者目前決定，不設網站密碼：頁面與一般 CRUD API 可公開存取。`SEED_SECRET` 僅保護初始化操作，不是全站登入保護。

## 驗證

- `npm run build`：正式編譯與 TypeScript 檢查。
- 本機 Turbopack 若受沙盒程序限制，可用 `npm run build -- --webpack`。
- 驗證匯入 URL 拒絕不合法主機、重複提交不重新擷取、失敗保存課堂、手動補件與筆記分開、seed 未授權回應 401。

舊 `scripts/seed.cjs` 含歷史課堂清單，不作本次部署初始化；使用受密鑰保護的 `/api/seed`。

### 手動校訂與學習流程

- **逐字稿校訂**：選擇原始段落，保存校訂文字、修正依據與核對狀態。原文不覆寫；手動補件 API 僅填補空欄位。
- **學習筆記**：七種固定分類，每則筆記保存原文快照、段落位置與時間。英文／縮寫為選填；考點區分教師明示與個人推測。
- **複習測驗**：快速複習僅列已核對筆記；有題目及答案的已核對筆記才加入測驗。自評留在本次頁面，重新載入會清除。此版本沒有 AI 自動校訂或自動出題。
- **搜尋**：課程、日期篩選，支援學習筆記、校訂、逐字稿與既有筆記內容；結果附命中片段與段落連結。每頁 40 筆。
- `lesson_studies` 保存每堂課的結構化內容，`study_revisions` 保留歷次儲存快照。版本衝突回傳 409，避免跨分頁覆寫；來源快照不符也拒絕保存。既有資料無需重新匯入。
- 驗證：`node tests/study.integration.cjs` 使用目前資料庫連線建立隔離的暫存 schema，測完刪除；測試涵蓋原文保護、來源驗證、並行保存衝突、分類搜尋與時間定位。需要 CREATE SCHEMA 權限。

### 效能

Vercel 運算區域固定為東京 `hnd1`，與目前 Supabase 的 `ap-northeast-1` 區域相近。首頁的統計、課程卡片及最近課堂各使用一次合併查詢，獨立資料並行讀取；課堂頁不再因為瀏覽而建立空白筆記，也不向前端序列化匯入除錯原始資料。`loading.tsx` 提供頁面切換時的即時回饋。

`node tests/performance-regression.cjs` 以唯讀方式比對與效能修正前版本的課程、標籤、複習狀態與統計，需可連線的 `DATABASE_URL` 及 Git 歷史。
