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

## 批次 3：圖鑑 repository 與詳情 view

- 資料請求與快取移至 lookup/repository；Wiki 圖片解析單獨保留，未限制原 HTTP adapter 的來源。
- 精靈詳情與身分渲染移至 pet-info-view，回呼與 DOM ID／class 保留。
- 圖鑑 DOM 查詢、observer、圖片 error listener 現在只在初始化時建立；再次初始化返回同一實例，避免重複綁定。
- 63 項 Node 測試通過，新增完整／精簡資料分離、in-flight 去重、失敗重試、關聯排序及實例快取隔離測試。
- 無頭 Chrome 使用固定 API／授權 fixture，於 1440px 與 390px 比較基準版和重構版：訪客導航、精靈詳情文字／面板尺寸相同，無 pageerror。
- 真正官方 SWF 渲染及正式資料庫寫入仍未作為此批驗收，未宣稱完整外部服務端到端驗證。

## 批次 4：前台控制器

- main 只組裝導航、session、登入 view、帳號、投票、排名與競技池；每個控制器自行持有其狀態及事件。
- 跨控制器以回呼及 getter 讀取所需狀態，沒有匯出可任意修改的全域狀態包。
- 登入／註冊開關保持停用，管理員判定、投票鎖定、排名刷新時機、登出停止刷新保留。
- 權限測試改為直接測試 session controller，保留原四種帳號／登出判斷斷言；63 項測試通過。
- Chrome 1440px／390px 的既有基準比較再次通過。

## 批次 5：後台控制器與 DOM 所有權

- 設定、通知／確認對話框、日期輸入、紀錄、兩種 Pool 編輯器、角色批次管理、競技預覽及 session 分離，各自保留原狀態與事件。
- DOM 查詢移至負責的控制器；跨控制器只傳必要回呼、getter 及共同節點。
- 保留原 CRUD／RPC、草稿限制、日期格式、批次匯入及 CSV；未操作正式資料庫。
- 63 項 Node 測試通過。Chrome 固定授權／資料 fixture 比較基準與重構版，1440px／390px 的前台導航與詳情、後台導航與草稿角色清單文字和尺寸一致，無 pageerror。
- 此次瀏覽器驗證禁止資料寫入，並不代表正式 CRUD 或官方 SWF 的端到端驗證已完成。

## 批次 6：培養與屬性 UI

- 培養模板、刻印彈窗及其 catalog／分頁狀態、搜尋 picker 與請求版本、裝備來源 model、結果 view、匯出資料 snapshot 分離。
- 計算公式仍由既有 training core 負責。第一階段維持 DOM 讀值與匯出 snapshot 契約，不同時改寫資料流。
- 屬性模板、名稱／圖示 view 與 picker 方法分離，保留 controller 公開 prototype 方法及原測試斷言。
- 63 項測試通過；Chrome 1440px／390px 比較屬性彈窗、選擇精靈／刻印、學習力、體力培養、年費、基礎／PVE／PVP 結果，與基準相同且無 pageerror。
- PNG 的 Canvas／圖片失敗備援依原測試驗收；真實跨來源圖片與正式 SWF 仍需外部服務可用時另驗。

## 批次 7A：圖片位置與 URL

- 166 個圖片搬至依用途分類的 assets 目錄，SHA-256／bytes 全部與原檔一致；清單與驗證工具可重跑。
- 動態圖示及預載入改用集中 URL helper，保留屬性 ID、分類 0、官方遠端規則及合成順序。
- HTML、CSS、metadata 與測試引用同步更新；分享圖和既有合成素材保留已記錄的相容副本，未知用途圖片不刪除。
- 65 項測試通過；helper 在 /seervote/ 子路徑驗證通過。Chrome 原版比較通過，已測互動沒有新增本地圖片 404。
