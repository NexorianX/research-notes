# Research Notes — 研究所課程智慧筆記網站

個人研究所課程知識管理系統：DOWAY URL → Lesson → Summary / Mind Map /
Transcript → 個人 Notes → 學期 Timeline。

## 執行方式（本機開發）

```bash
npm install
cp .env .env.local          # 編輯 .env.local，填入真實的 DATABASE_URL
npm run seed                # 建立 3 門課程 + 你已提供的所有 DOWAY URL（只建立 Lesson 外殼，不捏造內容）
npm run build
npm run start                # http://localhost:3000
```

開發模式：`npm run dev`。

## 部署到 Vercel

1. 這個 repo push 到 GitHub 後，到 https://vercel.com/new 選擇這個 repo 匯入。
2. 在 Vercel 專案的 **Environment Variables** 加入：
   - `DATABASE_URL`：Supabase 的 **Connection Pooling**（Session/Transaction pooler，
     port 6543）連線字串 —— 不要用 "Direct connection"，因為 Vercel 的 Serverless
     Function 是 IPv4，Supabase 的 Direct connection 目前只解析 IPv6。
     格式：`postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`
   - `SEED_SECRET`：任意一組隨機字串，用來保護一次性的 seed API（見下）。
3. 按 Deploy。首次啟動時 `src/lib/db.ts` 會自動建立所有資料表（`CREATE TABLE IF NOT EXISTS`），
   不需要另外跑 migration。
4. 部署完成後，瀏覽器打開一次
   `https://<你的部署網址>/api/admin/seed?secret=<SEED_SECRET>`，
   把 3 門課程與已提供的 DOWAY URL 灌進正式資料庫（`src/app/api/admin/seed/route.ts`，
   一次性，可重複呼叫不會重複建立）。之所以是一支 API 而不是本機 script：
   建置這個 repo 的環境對外只能走 HTTPS（GitHub / npm / Vercel），無法直接開
   Postgres 的 TCP 連線，所以改成讓 Vercel 自己的 runtime（它可以正常連
   Supabase）在收到這支 HTTPS 請求時執行 seed 邏輯。舊的 `npm run seed`
   （`scripts/seed.cjs`）仍保留，在任何能直連 Postgres 的環境（例如你自己的電腦）
   一樣可用。

## 與原始規格的一處技術替換

**UI 元件：手刻的 Tailwind + Radix 元件取代 shadcn CLI。**
功能與外觀對齊 shadcn/ui 的規格（Button／Input／Dialog／Tabs／
Select／Badge…都在 `src/components/ui/`），只是用檔案直接建立，
沒有跑 `npx shadcn init`（該指令的互動式安裝流程在無人值守環境中
無法執行）。

資料庫本身完全照規格使用 **Supabase PostgreSQL**（`src/lib/db.ts` 用
`pg` 連線池，schema 與 `prisma/schema.prisma` 保留的原始設計 1:1
對應；早期在無網路對外連線的沙盒環境測試階段曾暫時用過 SQLite，
正式版已經全部改為 Postgres）。

## DOWAY Importer 的三層 fallback（`src/services/importers/doway.ts`）

- **Strategy A**：直接 `fetch()` share 頁面的 HTML，嘗試解析內嵌的
  `__NEXT_DATA__` 或 `<script type="application/json">`，用關鍵字比對
  （title / summary / transcript / mindMap / audio）取值。
- **Strategy B**：Strategy A 失敗時，用 Playwright 開 headless Chromium
  實際渲染 JS 頁面，再抓取常見的 `[class*="summary"]` /
  `[data-testid*="transcript"]` 等容器文字。
- **Strategy C**：兩者都失敗時，**絕不讓 Lesson 建立失敗** —— 仍會建立
  Lesson 與 LessonSource（保留原始 URL），`syncStatus` 標記為
  `FAILED`，UI 顯示「DOWAY 內容目前無法自動讀取」，並提供「重新同步」
  「手動貼上 Summary/Transcript」「開啟 DOWAY 原始頁面」三個真正可以
  按的按鈕。

  **這個沙盒環境對外連線白名單不含 `dowayai.com`**（`binaries.prisma.sh`
  同理被擋），所以在這裡測試 Import 時 Strategy A/B 一定會落到
  Strategy C —— 這是環境限制，不是程式邏輯的 bug；程式碼本身在有網路的
  正式環境會先嘗試 A、再 B，最後才會落到 C。已經用單元測試方式驗證過
  三層 catch 都正確不拋出例外、Lesson 一定會被建立（見下方 QA 紀錄）。

  正式部署後若要讓 Strategy B 生效，記得執行一次
  `npx playwright install chromium`。

- **SSRF 防護**：`src/services/importers/doway.ts` 的 `parseShareUrl()`
  只允許 `https://` + hostname 白名單（`www.dowayai.com` /
  `dowayai.com`）+ `/share/{id}` 路徑格式；不符合就直接回傳「這不是
  有效的 DOWAY 分享網址」，不會讓 server 對任意網址發出請求。

## 測試資料

`npm run seed` 會建立：

- 3 門課程：電子商務管理、電子商務資料管理、電子商務網際網路技術
- 你在對話中提供的全部 11 筆 DOWAY 分享連結，依你給的日期建立成
  Lesson（含規格中指定的測試連結
  `https://www.dowayai.com/share/27293262`）
- 每筆 Lesson 的 Summary / Transcript / Mind Map **全部留空**，
  `syncStatus = FAILED`（UI 顯示「尚未同步」），符合「不可自行捏造
  URL 內容」的規定 —— 之後點「重新同步」（在有網路的環境）或
  「手動貼上」都可以把真正的內容填進去。
- Script 可重複執行，已存在的 (課程, URL) 組合會自動跳過。

## 最後驗證（QA）結果

| # | 項目 | 結果 |
|---|------|------|
| 1 | DOWAY URL 是否可正確辨識 | ✅ 正規表示式 + hostname 白名單，`/share/{id}` 格式驗證 |
| 2 | shareId 是否正確取得 | ✅ `extractId()` 單元測試通過 |
| 3 | JS 動態頁面抓不到時是否有 fallback | ✅ Strategy A → B → C，本沙盒環境下實測必落到 C |
| 4 | Import 失敗是否仍建立 Lesson | ✅ 已用 curl 實測：無效網址回錯誤訊息且不建立；有效網址格式即使抓取失敗也會建立 Lesson + Source（`FAILED`） |
| 5 | 每個 Lesson 是否有獨立 Notes | ✅ `notes` table 以 `lesson_id` 一對一（`getOrCreateNoteForLesson`） |
| 6 | Resync 是否不覆蓋 Notes | ✅ 已實測：resync 前後 Notes / Bookmark / Review Status 完全不變 |
| 7 | Timeline 是否依日期排序 | ✅ 全部以 `ORDER BY date DESC` |
| 8 | Course 是否正確分類 | ✅ 外鍵 `lessons.course_id`，Import 表單需先選課程 |
| 9 | Search 是否可搜尋 Transcript 與 Notes | ✅ 已實測：手動貼上內容後可被 Global Search 找到 |
| 10 | 重整網頁後資料是否還在 | ✅ Postgres 持久化資料庫，重啟伺服器後資料仍在（已用本機 Postgres 實測） |
| 11 | Desktop / Mobile 是否正常 | ✅ Sidebar 在 `md:` 以下收合成漢堡選單抽屜；所有頁面用 `max-w` + 響應式 grid |
| 12 | 是否有沒有功能的假按鈕 | ✅ 逐一檢查：匯入／重新同步／收藏／複習狀態／編輯／刪除／手動貼上／論文靈感／筆記自動儲存皆為真實可運作的按鈕 |

## 功能對照表

- Course CRUD：Settings 頁面（新增／改名／刪除）
- Lesson CRUD：Import DOWAY（建立）／Lesson Detail 編輯 Modal（更新）／刪除 API
- DOWAY URL Import：Sidebar「+ Import DOWAY」與 Course 頁面右上角按鈕
- Timeline：Dashboard 最近課程／Semester Timeline／Course Timeline
- Lesson Detail：Overview / Summary / Mind Map / Transcript / My Notes / Source 六個分頁
- Notes CRUD + Auto Save：Lesson Detail 的 My Notes 分頁（800ms debounce，顯示 Saving/Saved/Last saved）
- Smart Notes：在 Summary / Transcript 選取文字會跳出「加入筆記」「💡 論文靈感」快速動作列
- Tags：可在編輯 Modal 設定，Tags 頁面可篩選
- Bookmarks：Lesson Detail 一鍵收藏，Bookmarks 頁面總覽
- Review Status：○ 尚未複習／✓ 已複習／↻ 需要複習／★ 考試重點
- Thesis Ideas：從 Summary/Transcript 選取文字快速建立，集中列表可刪除
- Global Search：`/search?q=`，涵蓋 Course/Lesson/Summary/Transcript/Notes/Tags/Thesis Ideas
- Dark Mode：Light / Dark / System（`next-themes`）
- Responsive：Sidebar 手機版收合為抽屜選單

## 目錄結構

```
src/
  app/                 Next.js App Router 頁面與 API Route Handlers
  components/          UI 元件（含 src/components/ui 基礎元件）
  lib/
    db.ts              Postgres 連線池（pg）+ schema migration
    types.ts           共用型別
    repo/              資料存取層（courses / lessons / notes / tags / ...）
  services/importers/  DOWAY（以及未來其他來源）匯入邏輯
scripts/seed.cjs        測試資料 seed script（對 DATABASE_URL 指向的 Postgres 執行）
prisma/schema.prisma    保留作為資料模型文件（實際未使用 Prisma CLI）
```
