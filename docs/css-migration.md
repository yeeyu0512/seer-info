# CSS 拆分紀錄

style.css 保持原公開入口，依原始順序載入 13 個連續區段。沒有加入 layer、重新排序 media query、刪除覆寫規則或更動 selector／declaration。sections 中圖片相對路徑增加一層 ../；各段結尾空行整理為單一換行。

- 00-base: 原第 1 行開始
- 01-admin-and-lookup-base: 原第 841 行開始
- 02-pet-dialogs: 原第 1540 行開始
- 03-footer-and-responsive: 原第 2934 行開始
- 04-product-refinements: 原第 3041 行開始
- 05-catalog-and-about-refinements: 原第 3405 行開始
- 06-auth-and-character-refinements: 原第 4523 行開始
- 07-admin-and-auth-overrides: 原第 4868 行開始
- 08-background-and-account: 原第 5425 行開始
- 09-date-inputs: 原第 5544 行開始
- 10-catalog-and-type-picker: 原第 5832 行開始
- 11-type-versus: 原第 6630 行開始
- 12-training: 原第 7051 行開始

檔名說明區段主要責任；部分舊規則混合功能，先保留位置以保護 cascade。跨區段去重、重新設計與效能優化需另外以覆寫和視覺證據驗證，不在這批盲目刪除。
