# 重構驗收紀錄

基準：d637a471a8c6e5bd009a23239a4a4d18a1840aec。依 seervote-refactoring-plan.md 分批施工。

## 批次 0–1：測試基準與純資料／計算模組

- 固定 Node 22 以上及 npm test 指令；維持原生 ES modules，沒有新增執行期套件。
- type core／type options 與 mintmark catalog 移出 UI；舊入口保留 re-export。
- 培養與精靈圖鑑直接引用資料／選項模組，公式、篩選、分頁及資料請求保持原實作。
- 搬移前、搬移後：原有 55 項 Node 測試全數通過。
- 尚待驗證：真實瀏覽器互動、圖片來源及正式後台寫入；Node 測試不能代替這些驗證。

## 批次 2：共用工具與資料邊界

- 抽出繁簡轉換、兩種 HTTP adapter、有序並行 map、CSV escaping、兩種後台匯入 parser。
- 保留前後台各自的 trim／null／錯誤屬性和匯入重複規則，沒有將不同契約強行合併。
- 套裝 catalog 與常用 ID 清單移出 UI；Ruffle runtime 獨立，兩種 SWF renderer 仍各自持有 player／佇列。
- 新增工具契約測試；59 項測試通過。全部 35 個 JS 模組通過語法、相對 import 存在及循環依賴檢查。
- 尚待驗證項目同上；不操作正式資料庫。
