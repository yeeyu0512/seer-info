# 重構驗證

基準 commit：d637a471a8c6e5bd009a23239a4a4d18a1840aec。Node >=22，原生 ESM；沒有新增網站執行期套件。

## 本地檢查

- npm test：核心計算、隱藏刻印數值、套裝組裝／圖片失敗、匯出、授權與新資料契約測試。
- npm run check：全部 JS 語法、本地 import 存在及循環依賴。
- node tools/check-assets.mjs：166 個圖片的原始 bytes 與 SHA-256。
- git diff --check：本次修改的空白格式。

## Chrome 固定資料回歸

tools/browser-regression.cjs 使用 Playwright 與 Chrome，啟動本機伺服器，直接從 git show 讀取基準檔案，與工作目錄比較。所有外部 API／授權都以固定資料攔截；Supabase insert／update／delete／upsert 明確禁止，沒有正式資料寫入。

需要可用的 Playwright 模組。可透過 PLAYWRIGHT_MODULE 指定已安裝／環境提供的模組路徑；否則使用一般 Node 模組解析。CHROME_PATH 可指定 Chrome，Windows 預設為 Program Files 下的 Chrome。執行 node tools/browser-regression.cjs；亦可在最後傳入其他基準 commit。

覆蓋 1440px／390px、訪客導航、精靈詳情、皮膚 ID／分類查詢、精靈屬性篩選、屬性選擇視窗、培養選精靈／刻印、學習力、體力上限培養、年費與三種結果模式，以及後台導航／草稿角色清單。逐項比較文字、已記錄面板尺寸及瀏覽器解析的完整 CSS 規則順序，檢查 pageerror 與已測互動的本地 404。截圖僅放在忽略的 tmp/refactor-qa。

## 驗證範圍

固定資料回歸不能證明真實 SeerAPI、Wiki、圖片代理、Ruffle、跨來源圖片或正式資料庫 CRUD 永遠可用。這輪保留原契約與邏輯；沒有改 SQL／RPC、部署設定、功能開關或計算公式。PNG 延續既有 Canvas／下載測試。

本輪完成方案的安全拆分與資源整理。第二階段改寫 DOM 資料流、跨區段 CSS 去重，及可選的 lazy loading／壓縮屬於後續優化：未因拆檔擅自更動載入／渲染行為，也未宣稱下載量或速度已改善。
