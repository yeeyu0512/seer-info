# 賽爾號資訊站

提供精靈、皮膚、刻印、套裝圖鑑，以及屬性克制查詢與精靈模擬培養的玩家資訊站。

**[前往網站](https://yeeyu0512.github.io/seervote/)**

網站使用原生 HTML、CSS 與 JavaScript ES modules，可由靜態伺服器提供，不需要打包步驟。遊戲資料主要透過 SeerAPI 即時請求；帳號、投票與後台設定使用 Supabase。

## 功能

| 功能 | 內容 |
| --- | --- |
| 精靈圖鑑 | 依 ID、名稱或屬性查詢，查看種族值、技能、魂印與關聯皮膚；點擊屬性可前往克制查詢。 |
| 皮膚圖鑑 | 依 ID、名稱、綁定精靈或分類查詢，查看外觀與相關精靈。 |
| 刻印圖鑑 | 名稱／ID、類型、角數、系列與專屬刻印篩選；能力值包含隱藏加成，支援匯出篩選結果的 Excel 能力表。 |
| 套裝圖鑑 | 選擇套裝後按需載入組裝預覽，查看效果、介紹與部件；提供常用套裝及 PVE／PVP 有效篩選。 |
| 屬性克制 | 攻擊／被攻擊倍率查詢、雙方屬性試算與技能石分析。 |
| 精靈模擬培養（Beta） | 選擇精靈與關聯皮膚，設定個性、個體值、學習力、三個刻印、套裝、目鏡、稱號及其他加成；切換基礎／PVE／PVP 結果並匯出 PNG。 |
| 管理後台 | 投票池、競技池、角色批次匯入／刪除、投票紀錄與 CSV，以及台服推出進度設定。 |

### 目前的瀏覽模式

- 訪客預設進入圖鑑；非管理員隱藏投票頁籤與登入按鈕。
- 前台登入／註冊入口目前停用，相關開關位於 `js/account/auth-view.js`。
- `admin.html` 提供後台登入；管理功能仍需通過 Supabase 的管理員權限檢查。
- 精靈、皮膚與刻印可選擇僅顯示至設定的台服進度；部分合作內容無法只靠編號完全排除。

### 模擬培養的範圍

目前採一般滿級（Lv.100）公式，頁面 UI 仍在調整。支援可取得的覺醒種族值版本與刻印隱藏加成；皮膚選擇用於切換外觀。

- 個體值：0～31。
- 學習力：單項 0～255，總和不得超過 510。
- 體力上限培養：0～20，於套裝加成後加入。
- 年費加成：勾選後全屬性提升10點。
- 戰隊加成：攻擊、特攻、防禦、特防各上限 15；速度 10、體力 30。

異能精靈、特殊套裝例外與戰鬥中的條件效果尚未完整納入；目鏡或稱號的百分比能力加成目前會提示不支援。命中、暴擊與減傷不計入六維能力值。

## 本機啟動

用 HTTP 靜態伺服器開啟專案，不要直接雙擊 HTML 以 `file://` 瀏覽。

若已安裝 Python 3，在專案根目錄執行：

```sh
python -m http.server 5500 --bind 127.0.0.1
```

然後開啟：

- 前台：<http://127.0.0.1:5500/>
- 後台：<http://127.0.0.1:5500/admin.html>

也可以使用 VS Code Live Server 或其他靜態伺服器。連接埠可自行更換；5500 是本機範例，並非網站功能的必要設定。

瀏覽時需要網路連線，以取得 API 資料、CDN 模組與遠端圖片。Node.js 僅用於測試和維護工具，本機瀏覽本身不需要 Node.js 或 `npm install`。

## 設定與部署

### Supabase

連線設定位於 `js/supabase.js`。若部署自己的版本，請改成自己的 Supabase URL 與前端 publishable key；管理員驗證、資料表權限與 RLS 必須由自己的資料庫配置，不能只靠隱藏前台按鈕。

`sql/` 收錄進度設定、遊戲帳號綁定、競技池及部分投票 RPC 的建置／更新腳本。它們依賴既有投票資料表與 `is_admin()` 等設定，**不是完整的全新資料庫初始化套件**，請依各腳本的相依關係套用。

### 靜態部署

將 HTML、`js/`、`css/`、`assets/` 與 favicon 一併部署；GitHub Pages 的專案子路徑也可使用。CSS 入口會依序載入 `css/sections/`，不要只上傳 `css/style.css`。

若更換網域或專案名稱，也請同步更新：

- `index.html` 的 canonical、Open Graph、Twitter 與 JSON-LD 網址。
- `robots.txt` 與 `sitemap.xml`。

## 圖片如何載入

精靈頭像與立繪使用官方遠端圖片。刻印及套裝部件使用官方 SWF，由網頁載入的 Ruffle 在瀏覽器中渲染；使用者不需要安裝 Flash 或瀏覽器插件。

圖片採按需請求、佇列及有限快取，不遍歷官方圖片編號，也不將完整圖庫存入資料庫。刻印依可見內容載入；套裝在選擇後才載入所需部件。首次載入可能較久，來源失效或特殊 SWF 也可能無法預覽。

培養 PNG 匯出的角色縮圖會先嘗試直接載入，跨來源限制時使用圖片代理備援。這些外部服務的可用性會影響圖片顯示與匯出。

## 測試與維護

需要 **Node.js 22 以上**。目前測試使用 Node 內建 test runner，沒有額外 npm 套件依賴。

```sh
npm test
npm run check
node tools/check-assets.mjs
```

- `npm test`：計算公式、刻印數值、圖片佇列與組裝、匯出、權限及資料契約測試。
- `npm run check`：JS 語法、相對 import 存在與循環依賴檢查。
- `check-assets.mjs`：核對遷移圖片的原始 bytes 與 SHA-256；若刻意替換圖片，需同步更新清單。

Chrome 固定資料回歸工具為 `tools/browser-regression.cjs`，需要另有可用的 Playwright 與 Chrome。設定與驗證範圍見 [重構驗證說明](docs/refactoring-validation.md)。它禁止資料庫寫入；固定資料測試不能代替正式後台 CRUD 或真實外部圖片服務的驗證。

## 專案結構

```text
index.html / admin.html  前台與後台頁面
js/main.js              前台組裝入口
js/admin-page.js        後台組裝入口
js/app/、account/       導覽、登入狀態與帳號
js/lookup/              精靈／皮膚資料、瀏覽與詳情視窗
js/data/、shared/       catalog、共用工具與本地圖片 URL
js/types/、training/    屬性查詢與模擬培養元件
js/admin/、voting/      後台與投票控制器
js/seer-*.js            圖鑑入口、計算與圖片服務
css/sections/           保留載入順序的樣式區段
assets/                 網站圖片、分類圖示與套裝合成底圖
sql/                    Supabase 補充腳本
tests/、tools/          測試與維護工具
docs/                   重構方案、資源遷移與驗收紀錄
```

`tmp/` 為本機測試與暫存目錄，不納入 Git。圖片位置與清理紀錄見 [圖片遷移紀錄](docs/asset-migration.md)，CSS 拆分方式見 [CSS 拆分紀錄](docs/css-migration.md)。

## 資料來源

- [SeerAPI](https://api.seerapi.com/)：遊戲資料。
- 賽爾號官方資源：精靈圖片、刻印與套裝 SWF。
- [賽爾號 Wiki](https://wiki.biligame.com/seer/)：部分魂印圖片與百科連結。
- Ruffle、OpenCC、Supabase 與 Flatpickr：渲染、繁簡轉換、後端服務與日期輸入。

本專案為玩家資訊站，遊戲素材的權利屬於各原權利人。
