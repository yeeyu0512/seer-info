# 異常狀態資料維護指南

異常圖鑑與全站搜尋共用 [data/abnormal.json](../data/abnormal.json)。本文件說明資料編輯與核對規則；功能介紹見 [README](../README.md)。

## 資料位置與編號

資料範圍為陸服頁遊《賽爾號》的異常狀態，項目放在 `abnormals` 陣列。目前收錄編號 0～44，共 45 種。

- `id` 使用資料表既有的非負整數編號，保持唯一並依編號排序；不以陣列位置推算編號。這套編號尚未核實為官方編碼。
- **0 是有效編號**，不能以真假值判斷項目是否存在。
- `targetId` 與 `relatedStatuses` 使用相同的數字編號，且必須指向已存在的項目。
- `icon` 使用 `./assets/icons/abnormal/{id}.png`，對應圖片放在 [圖示目錄](../assets/icons/abnormal/)。

## 欄位填寫

| 欄位 | 規則 |
| --- | --- |
| `name`、`summary`、`description`、`effects` | 名稱、摘要、完整效果與補充判定；未知內容標示「待確認」 |
| `category` | 控制、弱化、附屬、其他擇一；「其他」為本站展示分類 |
| `tags` | 限制、衍化、特殊，可重疊；依來源標記，不因存在轉化效果就自行歸為衍化 |
| `removalConditions` | 已核對的解除條件；尚無依據時保留空陣列，疑問記於 `verificationNotes` |
| `transformations` | 每項包含 `targetId`、`condition`、`duration`、`note`；記錄觸發條件與轉化結果 |
| `relatedStatuses` | 相關狀態的 ID 陣列，適合互相參照的項目建議建立雙向連結 |
| `sources` | 來源名稱、網址、核對日期與適用範圍 |
| `verificationStatus`、`verificationNotes` | 核對程度與尚未釐清的細節，見下節 |

`transformations.duration` 表示**轉化後狀態的持續回合數**，未知時填 `null`。多個結果若為隨機擇一，須於 `note` 說明，避免被理解為同時發生。

狀態的持續時間通常由技能或來源效果決定，不能將某項轉化的回合數當成該狀態的固定持續時間，也不能將「最多 5 回合」改寫為「固定 5 回合」。

## 來源與核對程度

每筆來源記錄 `title`、`url`、`checkedAt`（`YYYY-MM-DD`）及 `scope`。公開來源保留原始 HTTPS 網址；提供的非公開表格使用 `type: "userProvided"`、`url: null`，不補造網址。修改資料時同步更新頂層 `updatedAt`，並依實際核對情形更新來源日期。

| `verificationStatus` | 意義 |
| --- | --- |
| `pending` | 資料仍待確認 |
| `coreVerified` | 核心效果已與記錄的來源核對，仍有未確認細節 |
| `verified` | 記載內容已完成核對，核對範圍仍以來源紀錄為準 |

**來源核對不等於遊戲實測。** 請在 `scope` 說明版本、PVP／PVE 等適用範圍，不直接套用其他版本（如啟航）的機制。提前解除、技能或魂印清除、結算時機等未釐清內容，保留於 `verificationNotes`，不要自行推定。

來源衝突時記錄各方說法與目前採用值，保留待確認標記。例如漸凍（43）轉冰封（15），目前 JSON 與測試採 3 回合，既有表格記錄為 2 回合，差異仍待核實。這類差異應保留來源脈絡，不能只為通過測試而視為已確認。

## 更新後檢查

```bash
node --test tests/abnormal.test.mjs
npm run check
```

既有測試會檢查編號、關聯、來源、圖示與部分效果資料，也涵蓋搜尋、分類及分享連結。若有依據地新增項目或修改分類、轉化效果，需同步調整測試中的預期資料；測試通過只代表資料與程式契約一致，不能取代遊戲機制查證。
