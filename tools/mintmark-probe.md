# 刻印圖片單檔測試

2026-10-05 測試 ID 42415。尚未接入正式圖鑑，沒有建立圖片 API 或資料庫快取。

## 實測

- 官方來源：`https://seer.61.com/resource/countermark/icon/42415.swf`
- HTTP 200，Content-Type `application/x-shockwave-flash`。
- Content-Length 與下載長度皆為 2,196 bytes。
- CWS、SWF 9，解壓後 2,368 bytes，畫布 50 × 50，12 fps，單幀。
- DefineShape3 × 1、DefineShape4 × 3、DefineSprite × 4、DoABC × 1。
- 沒有 DefineBitsJPEG/JPEG2/JPEG3/JPEG4 或 DefineBitsLossless/Lossless2，不能直接抽出 bitmap。
- 本機沒有 SWFTools 執行檔；舊官方下載頁轉向 GitHub 後回傳 404。未實測 SWFTools 渲染，不能据此判定它不支援此檔。
- Ruffle 官方 npm 套件 0.6.0，canvas renderer、transparent 模式可以顯示圖案。
- 以瀏覽器直接讀官方 SWF 成功，這次 localhost 來源無須代理。
- PNG 為 50 × 50 RGBA，4,343 bytes；2,500 像素中 1,423 完全透明、147 半透明、930 不透明。
- 此次從載入到匯出约 1.64 秒，包括 runtime 初始化、下載、等待有效畫面及匯出，並非純轉換 benchmark。
- 390 × 844 手機尺寸預覽正常；未使用實體 iPhone / Android 驗證。

只確認此圖可顯示且保留透明背景，沒有與原生 Flash 做逐像素比對，也沒有測其他年代刻印或大量列表效能。canvas backend 的效果相容性需要更多樣本驗證。

## 重現

1. `node tools/probe-mintmark.mjs`：下載、分析單一 SWF。
2. 將官方 `@ruffle-rs/ruffle@0.6.0` npm tarball 解壓至 `tmp/ruffle/package`。沒有修改專案依賴或將套件提交到 Git。
3. `node tools/probe-mintmark-render.mjs`：啟動僅綁定 localhost 的測試頁。
4. 開啟 `http://127.0.0.1:8768/?source=official` 測試直讀官方；省略 query 則用下載的本機檔。
5. 測試頁等待非全透明畫面，輸出 `tmp/42415.png` 和 `tmp/42415-render-report.json`。不將失敗的空白畫面當作成功。

`tmp/` 已加入 `.gitignore`。SWF、PNG、下載的 Ruffle JS/WASM 均不進 repository。

## 接入方向

若繼續，先驗證多年代樣本，再考慮按需載入、共用一個 renderer、順序轉換和頁面記憶體 PNG 快取。不能為每張卡片啟動獨立播放器。

Ruffle 的單個 WASM 檔未壓縮約 14 MB，需要評估首次載入成本。此方案不要求使用者安裝 Flash，也不要求存入資料庫。正式網站來源的跨域行為仍需部署後驗證。

參考：[Ruffle 官方](https://ruffle.rs/)、[透明模式](https://ruffle.rs/js-docs/master/enums/Config.WindowMode.html)、[renderer 設定](https://ruffle.rs/js-docs/master/interfaces/Config.BaseLoadOptions.html)。

## 圖鑑接入驗證

後續已接入 `js/seer-mintmark-images.js`。Ruffle 透過固定版本 CDN 按需載入，repository 不保存 runtime。

- IntersectionObserver 僅排程進入畫面的卡片；尚未開始的離屏或隱藏請求跳過。
- 全頁共用一個播放器。官方下載和轉換串行，每筆完成後間隔 500ms。
- 同一 ID 的併發請求合併，結果保存在頁面記憶體，最多 256 筆（包含失敗結果）。重新整理或 LRU 淘汰後可能再次請求，瀏覽器 HTTP 快取取決於官方回應。
- 失敗顯示預留圖示，不自動連續重試。官方 URL 固定，僅接受正整數 ID。
- 官方下載限制 1 MB、宣告解壓大小限制 8 MB，下载与渲染合計 15 秒逾時。Ruffle 首次 script 載入另有 30 秒上限。
- 禁用 SWF 腳本與頁面的互動、額外 SWF 網路存取和連結跳轉。
- 目前 PNG 輸出 150 × 150，卡片顯示 50 × 50；向量畫布同步以 150 × 150 渲染，並非將 50px PNG 插值放大。

用實際瀏覽器直讀官方驗證十個樣本：10001、10002、20001、20002、40001、40002、41001、42001、42724、42729，全部顯示成功。這是圖像相容性測試，沒有保存全面效能 benchmark。

依使用者最後指定，以 42729「雙生烈陽」驗證正式圖鑑模組：卡片和詳情使用相同 PNG，切換至 42724 能正確更新圖片，播放器數量為 1。尚未使用實體手機或正式部署來源驗證。

`node --test tests/mintmark-images.test.mjs tests/mintmarks.test.mjs tests/type-calculator.test.mjs` 共 25 項通過，涵蓋請求合併、串行、離屏略過、失敗快取、記憶體上限及既有圖鑑／屬性邏輯。
