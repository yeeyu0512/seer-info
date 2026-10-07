# seervote：維持完整功能的拆分與精簡方案

分析日期：2026-10-07。基準版本：[d637a471a8c6e5bd009a23239a4a4d18a1840aec](https://github.com/yeeyu0512/seervote/commit/d637a471a8c6e5bd009a23239a4a4d18a1840aec)，提交時間為台灣時間 12:25:28，標題為 `feat: export training cards with images and mark UI as unfinished`。

本文件根據該版本的程式碼、HTML、CSS、SQL 與測試分析。此次只研究方案，沒有修改或推送專案。本地未提交的變更、正式環境 Supabase 的實際 schema／RLS／RPC、真實瀏覽器與外部圖片服務的執行結果不在此次驗證範圍。

## 1. 結論與優先順序

目前最值得處理的是「單一檔案承擔多種職責」與「功能之間透過 UI 模組共享資料函式」，其次才是重複程式碼。建議繼續使用原生 ES modules，先完成可逐步回退的整理，不同時遷移框架、改資料庫、改遊戲公式或改頁面設計。

建議施工順序：

1. 固定現有行為與測試基準，記錄目前功能開關。
2. 抽出純資料／計算函式及共用底層工具，保留舊入口相容。
3. 拆分 `seer-lookup.js`，優先移出資料請求和精靈詳情渲染。
4. 拆分 `main.js` 與 `admin-page.js`，讓入口負責組裝，功能控制器持有各自狀態。
5. 整理培養頁、屬性計算器、刻印／套裝頁的模板與控制器。
6. CSS 先保留順序分段，再逐元件消除已驗證的覆寫；最後才做載入量優化。

「拆分」不一定讓總行數減少。有效的精簡來自去除確定重複的實作、分離資料與顯示、統一狀態來源；把程式壓成更長的一行沒有維護上的收益。

## 2. 大檔案盤點

大小為原始 UTF-8 檔案 bytes，KB 採 1,000 bytes；行數按取得的原始內容計算。

| 檔案 | 行數 | 大小 | 主要問題 | 處理優先度 |
| --- | ---: | ---: | --- | --- |
| `css/style.css` | 7,220 | 179.9 KB | 共用、前後台、圖鑑、計算器與多輪覆寫混雜 | 維護負擔高，刪改需較晚 |
| `js/seer-lookup.js` | 2,790 | 129.1 KB | 搜尋、API、快取、瀏覽、詳情、圖片與四種彈窗 | 最優先拆分 |
| `js/admin-page.js` | 2,188 | 101.9 KB | 登入、兩種 Pool、角色批次處理、紀錄、設定與通知 | 高 |
| `js/main.js` | 1,243 | 52.6 KB | 導覽、授權、投票、排名、帳號、競技池與資料工具 | 高 |
| `js/seer-type-calculator.js` | 958 | 43.1 KB | 倍率公式、查詢、對決、技能石、選擇器與模板 | 中高，純函式可先抽 |
| `js/seer-training.js` | 320 | 35.7 KB | 長模板、UI 狀態、選擇器、驗證、結果與匯出組裝 | 中高，不能只看行數 |
| `index.html` | 673 | 35.7 KB | 多功能面板和彈窗共用一個頁面骨架 | 保留骨架，先改善結構標記 |
| `js/seer-type-data.js` | 1,985 | 33.8 KB | 大部分是靜態資料，本身不是職責混雜 | 低，保留資料完整性 |
| `admin.html` | 370 | 27.7 KB | 後台面板與大量控制項 | 隨控制器整理，暫不改載入方式 |
| `js/seer-mintmarks.js` | 365 | 21.2 KB | 資料／篩選函式與頁面初始化同檔，被培養頁引用 | 資料部分優先移出 |
| `js/seer-suits.js` | 189 | 15.5 KB | 資料／篩選與套裝瀏覽、預覽介面混合 | 中 |
| `js/seer-suit-images.js` | 214 | 13.6 KB | SWF 修整、部件渲染、佇列與合成 | 保留專門模組，謹慎整理 |

`auth.js`、`pool.js`、`vote.js`、`ranking.js`、`admin.js`、`competitive-pool.js`、`game-account.js`、`supabase.js`、`seer-server-settings.js` 已經是較小的服務模組，沒有必要為統一形式再拆小。

## 3. 先固定「完整功能」的定義

必須以此版本行為為基準，不能把早期需求或目前隱藏的功能當成可以刪除的程式。

### 存取與帳號

- `main.js` 目前 `LOGIN_ENABLED` 和 `REGISTRATION_ENABLED` 均為 `false`。重構保留這些開關及停用提示，不能順手恢復開放。
- 訪客和一般帳號都不顯示投票功能；經確認的管理員才載入投票／排名並啟動刷新。後台登入是另一個流程，仍需保留。
- 保留既有 session 判斷、管理員檢查失敗時的處理、登出後隱藏功能、米米號綁定與提示。
- 前端隱藏與限制不是後端授權的替代品；此次整理不更改既有 RPC 及 RLS 契約，也不宣稱已驗證正式環境授權。

### 投票與競技池

- 剛好選滿指定數量、翻頁保留勾選、提交中停用、失敗恢復、成功鎖定與重新整理後還原選擇。
- 排名翻頁與每 5 秒刷新、登出停止刷新。排序與同票處理由既有資料／RPC 提供，前端重構不重訂規則。
- 競技池的禁止／限制／準限制分組、鍵盤切換、日期顯示、前台檢視與後台預覽。
- Pool 的狀態轉換、回草稿、刪除、批次匯入／刪除進度、投票紀錄與 CSV 匯出，全部保留。

### 圖鑑與計算

- 精靈／皮膚的 ID、名稱、繁簡搜尋、分類、屬性、台服進度篩選，以及空查詢時最新資料瀏覽與捲動載入。
- 詳情中的種族值／覺醒、技能分類與學習道具、魂印及強化切換、關聯皮膚、Wiki 外連、圖片備援與重試。
- 刻印的專屬／隱藏／台服／系列／角數篩選、最終值、分頁、詳情與完整篩選結果的 Excel 匯出。
- 套裝的常用／能力／外觀／PVE／PVP 篩選、按需預覽、進度、裝備部件合成與圖片失敗時的降級。
- 屬性查詢、對決、技能石、未選擇狀態、交換與從精靈詳情跳到指定屬性。
- 培養的精靈／皮膚／覺醒切換、三刻印及數值覆寫、個性、IV、EV、年費、戰隊、套裝、目鏡、稱號、體力上限與三種結果模式，以及 PNG 匯出。

### 共通互動

保留現有 DOM ID、`data-*`、class、ARIA、中文提示、焦點還原、Escape／方向鍵／Tab 行為、遮罩點擊判定、捲動鎖定與 RWD。分離模組時不順便更換自製彈窗和原生 `<dialog>` 的行為。

## 4. 共用層：哪些值得抽，哪些不可直接合併

建議新路徑是施工目標，並非要求一次建立全部檔案。每次只建立該次遷移實際用到的模組。

| 建議模組 | 現有來源／重複 | 建議責任與保留條件 |
| --- | --- | --- |
| `js/shared/chinese.js` | `main.js` 的兩個轉換函式、後台 `toTraditionalChinese` | 集中 OpenCC 與特殊字保留；呼叫端保留各自 trim／null／字串化語意 |
| `js/shared/http.js` | `fetchSeerJson`、後台 `fetchJson` | 提供請求基礎能力；保留 options／signal／Accept、後台的 payload 訊息、`error.status` 與 `error.resource` |
| `js/shared/concurrency.js` | 後台 `mapWithConcurrency`、圖鑑 worker | 可抽有序並行 map；不取代可見性佇列或 SWF 串行佇列 |
| `js/shared/csv.js` | 角色、票選紀錄、競技池 CSV | 抽 escaping、Blob 下載與 URL 清理；欄位、順序、BOM、檔名由原功能決定 |
| `js/shared/pet-type-icons.js` | 前後台各一套 metadata 快取／佇列 | 共享查詢與可見性載入，保留最大並行量、DOM 存活檢查、失敗處理及取消觀察 |
| `js/shared/type-options.js` | 圖鑑從整個屬性 UI 檔匯入 `getRelatedTypeOptions` | 移出無 DOM 的篩選；支援本地組合資料及 API catalog，不能只固定使用其中一份 |
| `js/data/mintmark-catalog.js` | 刻印頁前三個資料函式，培養頁也引用 | `fetchMintmarkCatalog`、`fetchMintmarkSeries`、`mintmarkCornerCount` 與純篩選；不引用刻印頁 UI 或 Excel 匯出 |
| `js/data/suit-catalog.js` | 套裝 catalog、培養 `fetchTrainingChoices("suit")` | 分階段共用 catalog 載入；保留各呼叫者的驗證、上限、進度和逾時設定 |
| `js/data/skin-resources.js` | 圖鑑皮膚 resource ID 與培養 `skinImageId` | 先比較規則與例外再共用；特別保留皮膚 840 的例外與圖片失敗後的精靈備援 |
| `js/shared/ruffle-runtime.js` | 套裝圖片透過刻印圖片模組取得 Ruffle runtime | 將 runtime 載入獨立，兩種圖片服務只共享 runtime，不共享 player 或全部渲染策略 |

### 不能因為相似就直接合併的部分

1. **戰鬥模式判定**：`suitBattleModes` 和 `trainingModes` 並不等價。前者以 bonus／描述篩選套裝，後者優先處理 `occasion.id`；無 bonus、矛盾描述等邊界也不同。先保留兩個公開函式，建立對照案例，才能抽共用文字解析。
2. **日期格式**：後台競技池預覽明確使用 `Asia/Taipei`，其他函式有使用瀏覽器當地時區。第一階段維持各呼叫點的既有選項，不一律改成固定時區。
3. **匯入解析**：一般 Pool 接受 ID 及可選名稱，重複行報錯；競技池接受分隔的 ID，重複 ID 會忽略並計數。只能共用基本 ID 驗證，不能換成同一個 parser 而改變結果。
4. **六維排列**：培養／刻印與圖鑑種族值的顯示順序不一致。可共用欄位定義，視圖的排序仍由各頁指定。
5. **HTTP 與快取**：圖鑑還透過 `fetchSeerJson` 查 Wiki API。不能把原函式直接改成只允許 SeerAPI host；應另設 SeerAPI repository 與 Wiki 服務。也不能一把 AbortController 同時中止其他消費者共用的 Promise。
6. **快取資料形狀**：圖鑑 catalog 使用精簡 entry，精靈詳情使用完整資料。共用 key 至少區別 resource、ID 和 expand 等查詢選項，不能用精簡資料污染詳情快取。

## 5. `seer-lookup.js`：最優先的拆分對象

這支檔案不只是圖鑑入口；它還有多種 API 快取、請求版本、IntersectionObserver、詳情渲染、Wiki 圖片解析及四種彈窗。精靈詳情 `renderSeerPetInfo` 單一函式就約 418 行。

| 建議檔案 | 搬移的現有函式／責任 | 狀態所有權 |
| --- | --- | --- |
| `js/lookup/repository.js` | `fetchSeerPetCatalog`、`fetchSeerSkinCatalog`、`fetchSeerPetDetails`、`fetchSeerPetInfo`、`fetchSeerElementTypeDetails`、`fetchSeerPetRelatedRecords` 等 | 資料快取與 in-flight Promise；不查 DOM |
| `js/lookup/search.js` | 精靈／皮膚名稱搜尋、關聯皮膚搜尋、分類／台服匹配 | 純條件與資料查詢；接收 query／filters |
| `js/lookup/browse.js` | 最新資料 offset、`loadSeerBrowsePage`、sentinel、屬性篩選的增量載入 | browse requestId、seenIds、offset、observer |
| `js/lookup/result-view.js` | 搜尋卡片、精靈／皮膚 preview、結果清理 | 接收 root、資料與事件 callback |
| `js/lookup/pet-info-view.js` | identity、種族值、技能、魂印 DOM；先拆成同檔內小函式 | 不擁有搜尋頁的全域狀態 |
| `js/lookup/pet-info-controller.js` | `loadSeerPetInfo`、詳情重試、切換精靈與關閉後失效 | 詳情 requestId、目前 petId |
| `js/lookup/skin-images.js` | 資源 ID、縮圖備援、`handleSeerLookupImageError` | 圖片備援快取；與通用資料分離 |
| `js/lookup/wiki.js` | `resolveSeerWikiSoulmarkImage` | Wiki 圖片解析快取 |
| `js/lookup/dialogs.js` | 精靈詳情、關聯皮膚、屬性選擇、外連視窗 | opener、backdrop pointer、捲動鎖；顯式協調多層視窗 |
| `js/seer-lookup.js` | 保留 `initSeerLookup`，組裝上述模組和搜尋事件 | lookup mode、query、filters；對外 API 保持不變 |

### 第一個可落地的切口

先移出 repository 及 pet-info-view，保留原函式名稱的薄轉接，UI 事件暫時留在入口。這兩塊邊界比「把上半／下半檔案切開」清楚，也較容易用固定資料檢查。

接著將頂層 `document.getElementById`、頂層 observer 和兩個圖片 error listener 移入初始化範圍。目前匯入該模組就會碰 DOM，不適合直接 lazy import 或多次初始化。應讓 `initSeerLookup` 建立依賴和狀態，而不是透過 export 更多全域變數來完成拆分。

### 必須保留的對外契約

`setMode`、`getMode`、`openPetInfo`、`openExternalLink`、`browseLatestIfEmpty` 及傳入的 `activateTab`／`openTypeLookup` callbacks 先不改。請求版本檢查仍屬於各功能控制器；共用 repository 回傳資料後，只有仍有效的請求可以更新畫面。

精靈詳情的種族值、技能、魂印可以先拆成同檔內三個渲染函式；沒有必要一開始為每個小 DOM 區塊建立檔案。

## 6. `main.js`：從總管變成組裝入口

| 建議模組 | 搬移範圍 | 重要介面 |
| --- | --- | --- |
| `js/app/navigation.js` | `activateTab`、主／次頁籤事件、權限下的可見性 | `activate(target)`，功能註冊表與權限 callback |
| `js/app/session-controller.js` | checkSession、syncAdminLink、auth callback、登入／登出狀態協調 | 狀態快照及角色變更通知 |
| `js/account/auth-view.js` | 登入視窗、註冊 UI、錯誤中文化、功能開關提示 | 登入成功／關閉 callbacks |
| `js/account/game-account-controller.js` | 綁定表單、load／renderGameAccount | 通知 binding state 改變 |
| `js/voting/controller.js` | loadPool、勾選 Set、還原已投票、提交、角色分頁 | `load`、`reset`、角色查找資料 |
| `js/voting/ranking-controller.js` | 排名載入、render、分頁與 timer | `load`、`startRefresh`、`stopRefresh` |
| `js/competitive/view-controller.js` | 當期競技池、三分類、日期與角色列表 | `load`，獨立 requestId |
| `js/main.js` | 建立服務、初始化 controllers、串接權限／帳號／導覽 | 不持有每個功能的 DOM 和業務細節 |

採小型 callback／依賴注入即可，不需要新增全站事件匯流排或狀態管理框架。投票持有 `currentPool`、角色、選擇與鎖定狀態；排名只取得所需的角色查找能力，不能任意修改投票狀態。

第一階段保持一次初始化，以及現在的排名啟停時機。切到別的頁籤就停止刷新、或改成只有 active 頁刷新，都屬於另外的行為變更，不混入拆分。

完成基礎拆分後，`activateTab` 的多層分支可改成功能註冊表，列出 panel、主分類、次頁籤與 onEnter。仍保留非管理員對投票面板的保護和目前預設頁面。

## 7. `admin-page.js`：按後台任務分開

建議拆成下列控制器，入口只處理登入／授權與組裝：

| 建議模組 | 職責 | 遷移注意事項 |
| --- | --- | --- |
| `js/admin/session-controller.js` | 管理登入、切換帳號、權限／拒絕畫面 | 登入表單不能被前台停用開關意外影響 |
| `js/admin/pool-editor.js` | Pool 清單、選擇、新建、儲存、狀態／刪除 | 擁有 selectedPool，維持 draft 控制項限制 |
| `js/admin/character-manager.js` | 單隻新增／查詢、搜尋、分頁、匯入與批刪 | 透過 callback 取得當前 Pool，保留進度與部分失敗處理 |
| `js/admin/vote-records.js` | 紀錄載入、搜尋、分頁、CSV | 切 Pool 不能留下舊資料；匯出仍使用完整原資料 |
| `js/admin/competitive-editor.js` | 競技池 CRUD、三分類角色、匯入／匯出 | 獨立 selectedCompetitivePool、characters 和匯入狀態 |
| `js/admin/competitive-preview.js` | 預覽視窗、分類計數、角色與鍵盤導覽 | 接收唯讀 snapshot，關閉還原焦點 |
| `js/admin/server-settings.js` | 台服精靈／皮膚／刻印進度 | 保留舊 schema 缺刻印欄位的相容行為 |
| `js/admin/confirm-dialog.js` | 確認視窗、通知佇列、Promise resolve | 不把確認與通知改為並行，避免覆蓋尚未回答的訊息 |
| `js/admin/date-inputs.js` | Flatpickr、日期／時間選單、ISO 轉換 | 保留初始化順序、目前時區和 disabled 狀態 |
| `js/admin/import-parsers.js` | 兩種匯入 parser，先維持獨立函式 | 可直接用純輸入／輸出測試保住錯誤行號與重複規則 |

整體遷移順序：先搬 parser／CSV／日期／通知，再搬 server-settings／vote-records，最後處理 Pool 與角色管理的互相通知。競技池是較獨立的一組，可另外完成一批。

DOM 查詢、事件綁定和它使用的狀態應一起搬。單純把所有事件搬到 `events.js`，卻讓它依賴另一檔幾十個可變全域，只是換位置，沒有真正降低耦合。

## 8. 培養頁：保留計算核心，整理輸入和結果

`seer-training-core.js` 已經是清楚的純計算模組。`seer-training-export.js` 與 `seer-training-selectors.js` 也已有專責，應延續這個方向。

建議新增：

- `js/training/template.js`：主頁與彈窗骨架、statsInputs。靜態模板保持原 ID／data 屬性；API 名稱和描述继續使用安全的文字節點，不因抽模板改成未轉義 HTML。
- `js/training/state.js`：selected、skin、race mode、輸入數值、resultMode；先小範圍引入，不必一次把每個表單都改寫。
- `js/training/model.js`：`activeRace`、來源轉換、套裝適用精靈、專屬刻印驗證，以及組裝 `calculateTraining` 的參數。
- `js/training/mintmark-picker.js`：刻印 catalog／series、專屬條件、12 個一頁、槽位與關閉清理。
- `js/training/result-view.js`：數值與明細渲染、模式頁籤、錯誤提示。
- `js/training/export-data.js`：依 state／計算結果建立匯出 DTO，供既有 PNG 模組使用。
- `js/seer-training.js`：保留初始化入口與協調，更換精靈、載入覺醒、UI 事件分批搬移。

目前 `recalculate` 同時從 DOM 讀值、檢查條件、算結果及顯示；匯出又從已渲染的 DOM 取結果。理想方向是「讀入／更新 state → 建立計算輸入 → 計算一次 → 同一結果給畫面和匯出」。這是第二階段的實質整理，先搬移函式時仍保留原讀值行為，避免同時改兩件事。

### 不可改變的計算／操作條件

保留 EV 分數到個性修正後才取整的規則、EV 單項 255／總和 510、IV 0～31、體力培養 0～20、戰隊各維上限、隐藏刻印加成只計一次、刻印手動調整與還原、套裝百分比／固定值、PVE／PVP 適用性，以及體力培養在套裝之後加。

百分比稱號／目鏡目前是明確不支援並顯示錯誤，重構不能把它們變成靜默忽略。換皮膚只改外觀；換精靈時對覺醒、皮膚、專屬刻印的處理也必須保持。

PNG 原本的頭像／三刻印、官方圖片 CORS 備援、檔名清理與成功／失敗 feedback 全部保留。更換代理服務是獨立工作，不是拆分必須同步做的事。

## 9. 屬性計算器、刻印與套裝

### 屬性計算器

先將 `calculateTypeMultiplier`、`getTypeMatchupAnalysis`、`getSkillStoneMatchupAnalysis` 等無 DOM 函式移入 `js/types/core.js`，`getRelatedTypeOptions` 移入共享選項模組。舊檔先 re-export，讓現有測試與 import 繼續工作。

再移出 `js/types/template.js`、`js/types/picker.js` 和 `js/types/view.js`；保留 `SeerTypeCalculatorController` 的公開方法與 `initSeerTypeCalculator`。目前測試會用其 prototype 或 subclass，因此不必為了拆分立刻移除 class。

初始化現在先建立圖鑑，再建立屬性 controller；圖鑑 callbacks 使用後建立的變數。這在現有呼叫時機可行，但將來改 lazy load 時必須重新處理 ready 時機。暫時維持 eager 初始化，或在另一批修改中以顯式 `ensureTypeCalculator()` 協調。

`seer-type-data.js` 本身可以維持資料檔。不為縮短行數更改屬性 ID、組合或倍率表；資料是否可重新生成，要另行驗證來源和例外。

### 刻印與套裝

先移出 catalog／select，消除培養頁對 `seer-mintmarks.js` 整個 UI 模組的依賴。之後再視維護需要把詳情／模板從刻印入口分開，以及把套裝 preview 和列表 render 分開。

可以共享「常用套裝 IDs」，但不能強迫兩種 UI 使用相同 page size 或篩選語意。資料快取共享應一次只替換一類 resource，並用請求計數確認不會每開頁就重抓整份 catalog。

圖片服務維持串行 SWF 轉換、可見性判斷、去重、有界快取、按需載入與原清理行為。不要把 SWF 工作丟進一般 API 並行 pool，也不要將圖片 renderer 再搬回頁面控制器。

## 10. CSS：先可讀地拆，再安全地減

`style.css` 存在基本樣式、Product visual refinement、密度調整、登入 refinement、Final Admin overrides 等不同時期的規則；同名 selector 不能被當成全數重複。後段「屬性克制計算器」註解附近亦混有刻印樣式，不能依標題直接一刀切。

### 第一階段：順序不變

1. 以完整 CSS 規則／at-rule為單位，按原連續區段搬入 fragment。
2. `style.css` 暫時作為順序清單，使用本地 `@import` 依原順序載入；不加 `@layer`，不重排規則，不同時合併 media queries。
3. 原本的 `[hidden]` 保護與共享 modal／character-card 規則保留。
4. 每段搬移後檢查括號、資源相對路徑和前後台實際顯示。初期多幾個 CSS 請求是清楚列出的取捨，不能宣稱載入更快。

培養頁尾段是相對集中、class 多有 `training-` 前綴的候選切口；仍需連同它後續的 media rules 完整搬出。其他歷史區段可先命名為 legacy fragments，等驗證後再歸入元件或功能。

### 第二階段：按功能收斂

目標可分成 base、layout、components、auth、voting、admin、lookup、mintmarks、suits、types、training。需要先查清跨功能共享的 `.character-card`、`.admin-confirm-dialog`、`.seer-pet-type-dialog` 等選擇器，不能全部放進單一頁的 CSS。

對每一個元件列出 base／狀態／斷點，查看 desktop／mobile 的最終樣式後，逐項合併已被覆寫的屬性。只有確認在所有適用 viewport／狀態都不再生效的宣告才刪除；未使用 CSS 的判斷必須包含 JS 動態 class／模板／錯誤狀態，不限 HTML 靜態搜尋。

CSS 整理與 UI redesign 分開提交。後續若匯入極小的產製步驟，可合成單一 production CSS，但不是此次拆分的先決條件。

## 11. HTML、SQL、圖片與小型服務

- `index.html`、`admin.html` 先保留 page skeleton、靜態語意與 script 次序。整理 section 標記與 DOM 查詢的所屬功能即可；不為拆分新增 runtime fetch HTML 的失敗風險。
- 動態生成的大段 HTML 優先移入 JS template 模組，浏覽器仍可直接使用 ES module，維持現有静態部署。
- `sql/` 的檔案已較小。此輪不改名稱、參數、資料表、RPC 和 migration 順序；部署端當前是否完整應另行核對。
- 圖片整理納入獨立批次 7A，命名與遷移對照詳見 11.1。圖片資源不按檔案大就刪除。repo 中 `seer.png` 與 `assets/seer-base.png`，以及 `seerhead.png` 與 `assets/seer-head.png` 分別有相同 blob SHA，確實是相同內容的重復路径；先查完整引用與可能公開 URL，再决定是否統一。`bg.png` 約 7.63 MB，轉格式／縮圖是另一個可衡量的資源優化工作，不混入程式拆分。
- `seer-icons.js` 是全站 icon 預載入，和「根據精靈 ID 查詢其屬性、可見才載入」不是同一功能。抽出 type-icon 服務時兩者都保留。
- 已有小服務保留目前公開契約；不要建立統一萬能 API 或把所有 Supabase 小檔合回一個大檔。

### 11.1 圖片統一命名與位置調整：獨立施工批次

本次補充已核對此版本 HTML、CSS、JS、測試與 `tools/` 的圖片引用。以下是實際用途與建議路徑，並非已完成搬移。

#### 現有圖片到新位置的對照

| 現有位置 | 已確認用途 | 建議新位置 | 命名／遷移原則 |
| --- | --- | --- | --- |
| `bg.png` | 全站 body 背景 | `assets/site/background.png` | 按用途命名；本批不改尺寸或格式 |
| `1400523.png` | 關於頁作者選用頭像 | `assets/site/author-avatar.png` | 網站固定素材按用途命名，原資源 ID 記錄於對照表 |
| `1400837.png` | 關於頁裝飾、Open Graph／Twitter 分享圖 | `assets/site/about-artwork.png` | 同一圖保留單一正式檔案；分享 metadata 使用完整部署 URL |
| `1400867.png` | 後台登入裝飾 | `assets/site/admin-login-artwork.png` | 不放入遊戲資料頭像目錄，依目前 UI 用途命名 |
| `assets/seer-base.png` | 套裝預覽的賽爾底圖 | `assets/seer/base.png` | 和其他合成資源集中管理 |
| `assets/seer-head.png` | 套裝圖片合成頭部 | `assets/seer/head.png` | 保留圖片原始內容與合成順序 |
| `seer.png`、`seerhead.png` | 分別與上述 base／head 有相同 blob SHA；未找到此版文字引用 | 對應 `assets/seer/base.png`、`head.png` | 先查公開路徑相容需求；確認後才移除重複檔案 |
| `seer_icons/{數字}.png` | 屬性組合圖示 | `assets/icons/types/{id}.png` | 保留 ID，不重新編號、不改成中文屬性名稱 |
| `seer_icons/common_pet_skin_icon_{id}.png` | 皮膚分類圖示 | `assets/icons/skin-categories/{id}.png` | 用資料夾區分用途，保留分類 ID；0 也是有效分類 |
| `seer_icons/sex_male.png` | 雄性圖示 | `assets/icons/gender/male.png` | 語意命名 |
| `seer_icons/sex_female.png` | 雌性圖示 | `assets/icons/gender/female.png` | 語意命名 |
| `seer_icons/sex_sexless.png` | 無性圖示 | `assets/icons/gender/sexless.png` | 語意命名 |
| `seer_icons/prop.png` | 技能區的屬性攻擊圖示 | `assets/icons/skills/attribute.png` | 與屬性組合圖示分開，不為了統一 ID 硬塞入 types |
| `favicon.ico` | 瀏覽器圖示與前後台 logo | 暫保留根目錄 `favicon.ico` | 已是清楚名稱；維持常見 favicon 路徑，避免不必要搬移 |
| `42578.png` | 在此次取得的文字檔中未找到引用，尚未確認內容／用途 | 暫保留原位置 | 不推定用途、不刪除；實作時檢視圖片及歷史，再決定正式分類 |

網站固定素材採小寫英文 kebab-case；遊戲查表資源採穩定 ID 檔名；目錄採小寫且按用途分類。若將來存入本地精靈／皮膚素材，應另設資源目錄並記錄究竟使用 pet ID、skin ID 或 resource ID，不能混用不同編號系統。

#### 集中管理 JS 的本地圖片位置

建議加入 `js/shared/assets.js`，提供 `typeIconUrl(id)`、`skinCategoryIconUrl(id)`、`genderIconUrl(gender)`、固定網站素材與套裝底圖 URL。對應關係應清楚可讀，不必另設複雜資產管理框架。

- 在該模組中用 `new URL("../../assets/...", import.meta.url).href` 解析專案內位置。因模組位於 `js/shared/`，相對層級要依實際檔案確認；不要讓搬至子目錄的功能模組各自拼路徑。
- 屬性 ID 保留正整數驗證；皮膚分類 ID 允許 0，不能沿用排除 0 的通用 validator。性別 key 以明確對照表處理。
- 前後台角色圖示、圖鑑、屬性計算器、預載入清單、套裝圖片模組均改用集中入口，避免只改畫面卻漏掉預載入器。
- HTML 的靜態圖片與 favicon 仍使用部署可用的相對 URL；CSS 的 `url()` 依 CSS 檔案位置解析，不能直接套用 JS 的 `import.meta.url`。CSS 搬檔之後要再次核對。
- `og:image`／`twitter:image` 必須保留正確的完整公開 URL。GitHub Pages 的 `/seervote/` 子路徑需保留，不能改成網域根目錄 `/assets/...`。

#### 完整引用遷移清單

除了直接搜尋檔名，還要檢查動態組合的路徑：`seer_icons/${id}`、`common_pet_skin_icon_${id}`、預載入陣列、性別對照、圖片 fallback，以及測試中對 `.src` 的斷言。

此版已確認需要檢查的檔案包含 `index.html`、`admin.html`、`css/style.css`、`main.js`、`admin-page.js`、`seer-lookup.js`、`seer-type-calculator.js`、`seer-icons.js`、`seer-suits.js`、`seer-suit-images.js` 和 `tests/type-calculator.test.mjs`。實作時仍須重新搜尋整個 repo，涵蓋新增檔案、`tools/`、文件、metadata 與其他公開引用。

若集中 URL helper 使回傳值從相對網址變成絕對網址，測試應核對解析後的正確 pathname 與專案 base path，而非直接刪掉圖示斷言。別讓預覽伺服器測試通過，卻在 GitHub Pages 子路徑部署時失效。

#### 搬移與舊路徑相容策略

1. 先建立舊路徑 → 新路徑 → 消費端對照表，盤點圖片 bytes／SHA；未確認用途的檔案列為待分類。
2. 建立集中 URL helper，再按用途搬移圖片並更新所有引用。使用 `git mv` 保留可追溯性；每一組搬移都檢查內容沒有被改寫。
3. 程式與 metadata 全部指向新位置；對已確認公開使用的舊 URL 保留相容副本，並在對照表列出原因。像舊分享圖 URL 不應未評估就刪除。
4. 對重複的 base／head，先統一內部引用。確認沒有需要保留的公開連結後再去重；不能以 repo 中沒有文字引用證明外部不存在引用。
5. 不使用新的 JS runtime redirect 來處理靜態圖片相容；現有靜態部署若無可靠伺服器 redirect，就以明確保留舊檔處理。
6. 未引用但用途不明的 `42578.png` 不作自動刪除。保留它不代表已判定應永久使用舊路徑，而是等待證據。

去重與相容可能暫時衝突。目標是只有一個正式資源來源，但為保護既有公開 URL，允許明確記錄的過渡副本；不能為了讓目錄看起來乾淨而破壞連結。

#### 不納入本地搬移的圖片

`newseer.61.com` 頭像／立繪、`seer.61.com` 官方 SWF、Wiki 魂印圖片、圖片代理、執行時生成的 data／blob URL 與使用者下載的 PNG 不屬於這次本地檔案搬移。保留官方 ID／resource ID 規則、皮膚特殊例外、CORS 備援、按需渲染、快取和物件 URL 清理，不改成批次下載到 repo。

#### 圖片批次的驗收標準

- 對照表中的本地資源在新路徑都存在，圖片 SHA／bytes 與搬移前一致；相容副本與待分類檔案有明確記錄。
- 查遍文字與模板後，舊路徑僅出現在對照文件或明確保留的相容處理，不留下失效的內部引用。
- 以 GitHub Pages 的 `/seervote/` 子路徑方式啟動驗證環境，檢查前後台、圖片預載入與 `tools/` 沒有新增本地資源 404。
- 檢查背景、關於頁作者／裝飾、後台登入裝飾、favicon、屬性／分類／性別／技能圖示、套裝底圖及合成頭部；確認分類 0 正常。
- 核對 Open Graph／Twitter metadata URL，並確認已決定保留的舊公開路徑仍可取得。
- 跑相關測試，再檢查培養 PNG 與外部圖片 fallback 沒有受到本地 URL 調整影響。
- 此批只整理檔名與位置。背景壓縮、WebP／AVIF、裁切、重新設計及遠端代理替換另開批次，避免難以判斷視覺差異來源。

## 12. 分批施工與驗收

| 批次 | 具體內容 | 本批完成標準 |
| --- | --- | --- |
| 0 | 固定版本、盤點開關、建立 smoke cases，明確 Node 與測試命令 | 現有 55 項通過；功能基準可重現 |
| 1 | type core／options、mintmark catalog，舊檔 re-export | 純資料模組無 DOM／UI import；原測試通過；現有頁面 import 不破 |
| 2 | chinese／HTTP adapter／CSV／parser／type icons | 舊錯誤屬性、轉換邊界與匯出格式一致；請求並行與取消觀察不變 |
| 3 | lookup repository、pet-info view，之後 browse／dialogs | 查詢／捲動／详情／關聯皮膚／跨頁跳轉與失敗重試通過；舊请求不覆盖新結果 |
| 4 | main 的導覽／session／voting／ranking／competitive／account | 訪客、一般帳號、管理員行為相同；登出停止 polling；重復進入不重復绑定 |
| 5 | admin 的設定／紀錄／通知，之後兩種 Pool 與 character manager | draft／active／closed 控制與現有 RPC 不變；preview、批次進度、CSV 一致 |
| 6 | training template／picker／model／result／export DTO；type UI | 數值、錯誤、裝備適用性、換外觀、PNG一致；不改公式 |
| 7A | 圖片集中 URL helper、統一命名／位置、完整引用遷移與相容清單 | 原始圖片內容不變；子路徑部署無新增本地圖片 404；metadata、預載入、測試、合成正常 |
| 7B | CSS 順序拆分與逐元件收斂；HTML 小整理，重新核對 CSS 圖片相對位置 | 前後台 desktop／mobile、彈窗與狀態樣式一致，無資源路徑失效 |
| 8（可選） | lazy import、共用完整 catalog cache、產製 CSS／圖片優化 | 有前後下載量／請求數／載入耗時比較，並單獨驗收首次進入與重試 |

每批獨立 commit，最好圍绕單一邊界。開始每批之前確認目標仍基於同一版本；若主分支已有新增功能，先把差異納入清單。發生回歸就回退该批或修復後再继續，不一次移動全專案路徑。

入口／協調器可把約 150～300 行、一般模組約 200～600 行當作閱讀參考，不是硬性限制或預先承諾。資料表、模板、專門算法可以超過；更重要的是檔案能用一句話描述責任、沒有循環 import、不用匯出一大包可變狀態。

## 13. 測試現況與補強範圍

本次在 Node `v24.19.0` 运行現有 `node --test` 測試：55 項通過、0 失敗、0 跳過。測試中刻印圖片 404 是模擬失敗案例產生的預期輸出。這證明現有測試可在此環境跑完，不等同所有功能已獲完整驗證。

根目錄確實沒有 `package.json`，但「因此一般 node --test 會失敗」在本次環境沒有重現。建議補明確的 ESM／scripts／Node 版本說明是為了讓執行條件一致，不把它列為已確認故障。

### 現有測試對重構的限制

- `browsing-access.test.mjs` 從 `main.js` 文字中抓指定函式，再交給 VM；即使行為相同，搬檔或改成 factory 後也可能失敗。遷移该批應同步改為測試導出的 session／access 行為，不能直接刪掉或放宽授權斷言。
- 屬性測試調用 controller prototype／subclass；保留公開方法或在對應批次更新測試對象，但維持相同逻辑斷言。
- PNG 測試 mock Canvas、Image 與下載，尚不能證明真實 CORS、代理服務、字型與成品布局。
- 套裝／刻印圖片測試檢查部分佇列、SWF 資料與組裝邊界，仍需真實浏覽器驗證。
- 精靈搜尋／詳情、後台流程、導覽事件與 CSS 沒有完整端到端覆盖。

### 只補與遷移風險直接相關的測試

1. 用固定 API fixtures 驗證 lookup repository 的資料形狀、references 順序、失敗快取清除，以及技能道具／屬性／覺醒失敗時原來的降級。
2. 用延遲 response 驗證快速輸入／換模式／關閉彈窗後，舊結果不會覆蓋目前畫面。
3. 為兩個 import parser 保留正常、空白、重復、錯誤行號與可選名稱案例；為兩種戰斗模式函數保留邊界差異。
4. 保住三類帳號、登出竞態、剛好 X 票、提交失敗恢復與成功鎖定；對 controller timer／事件的重複初始化做有意義的計數。
5. 培養改 state／DTO 時，用同一份 fixture 比對畫面數據與匯出資料，以及專屬刻印、限定精靈套裝、百分比不支援提示。
6. CSS 用真實瀏覽器比較代表畫面：桌面約 1440px、手机約 390px，以及現有主要斷點兩側；涵蓋長中文名稱、無數據、載入中／錯誤、展開詳情、原生與自制彈窗。

測試資料應避免操作正式投票資料或批次刪正式 Pool；需要寫入流程時使用專門測試環境／測試 Pool。這是驗收環境的選擇，不影響保留生產逻辑。

## 14. 完成後應得到什麼

更改圖鑑详情時只需閱讀圖鑑详情相關模組；新增培養輸入時不用穿越圖鑑 catalog UI；調整後台匯入時不碰後台登入與預覽；入口能直接看懂功能如何組裝。

第一階段不承諾總檔案 bytes 大幅減少。真正可量化的收益是重復實作數減少、資料層不依賴 UI、單一修改觸及範圍縮小、每批有可驗證的不變行為。性能收益要等 lazy load、資源和緩存優化完成後另行測量。

推薦第一批實際實施：移出 **type core／type options** 與 **mintmark catalog**，保留 re-export；第二批再動 `seer-lookup.js` 的 **repository + pet-info-view**。這兩步能先建立清楚邊界，也直接為最大檔案減負。

## 15. 可直接交給 Codex 的執行指示

請依這份方案分批重構 seervote，維持目前完整功能和 UI 行為。先閱讀專案的 AGENTS.md（若有）、檢查工作目錄與目前 HEAD，保留使用者未提交的變更。方案基準為 `d637a471a8c6e5bd009a23239a4a4d18a1840aec`；若現在版本較新，先確認新增功能與差異，再以實際程式碼修正搬移清單。

先跑現有測試作為基準，再實作批次 1：抽出 type core／type options 與 mintmark catalog，保留既有入口 re-export。通過相關測試及頁面驗證後，依方案繼續下一個邊界；每次只處理可獨立驗證與回退的一批。

維持原生 ES modules、既有公開函式／DOM／資料契約、功能開關、公式、圖片按需載入與授權流程。先搬移，再做去重；CSS 先保留原順序，不根據同名 selector 直接刪規則。測試若因搬檔而需更新，改測新介面的同一行為，保留原斷言。

每批回報：搬移哪些職責、保留哪些契約、通過哪些驗證及尚未驗證的部分。不要將程式行數減少當成唯一目標；不要把重新設計 UI、改資料庫、改公式、改圖片代理或正式發布混在拆分提交裡。

圖片整理亦屬於本次重構範圍，請依 11.1 的命名／位置對照及批次 7A 獨立處理。更新 HTML、CSS、JS、動態路徑、預載入器、測試、工具和分享 metadata，使用集中 URL helper；保留遊戲資源 ID、官方遠端規則與原圖片內容。根目錄 `42578.png` 先確認用途，已公開使用的舊 URL 先處理相容，再決定刪除；CSS 拆分後重新驗證資源相對路徑。
