# 圖片遷移紀錄

本次只搬移檔案，未改格式、尺寸或內容。tools/asset-manifest.json 記錄全部 166 個資源的原 SHA-256 與 bytes；node tools/check-assets.mjs 可重新驗證。

| 舊路徑 | 新路徑 | bytes | SHA-256 |
| --- | --- | --- | --- |
| bg.png | assets/site/background.png | 7632693 | 8749bdb95e97e2f812a1a76b88adf0d32c1bc193521893a27c8aba4115870f00 |
| 1400523.png | assets/site/author-avatar.png | 260975 | 595d4dabafd9477f6df7aba855bf2cc9f4fe9e9b3c4dec80b81519d7fcb73a3e |
| 1400837.png | assets/site/about-artwork.png | 99358 | 0f19ecdab5eed6d565ca89ecb1b51fc18c7655906d62d67ab6bd3655b5c8347d |
| 1400867.png | assets/site/admin-login-artwork.png | 107286 | 64128d9bcf670b1030e194d3afe566ec45d3417db3bb12cc25d8c1faf0a0b739 |
| assets/seer-base.png | assets/seer/base.png | 57864 | 0434a93aa2eed060e9b8e7610a1e384eb4366e4ce824c5d795d7b21ea61f7d82 |
| assets/seer-head.png | assets/seer/head.png | 22276 | c5fb5d816958ce11f509471b3464ae04e4c72c092b51d6ad5ad5afb073d3c6b4 |

seer_icons 的數字圖示移至 assets/icons/types；common_pet_skin_icon_* 移至 assets/icons/skin-categories；sex_* 移至 assets/icons/gender；prop.png 移至 assets/icons/skills/attribute.png。ID（含分類 0）保持不變。

## 相容與待分類

- 1400837.png：舊 Open Graph／Twitter 公開分享圖 URL 保留副本；新 metadata 指向 assets/site/about-artwork.png。
- seer.png、seerhead.png，以及 assets/seer-base.png、assets/seer-head.png：保留既有可能對外使用的合成素材 URL，內部統一新路徑。
- favicon.ico 維持根目錄。
- 42578.png 已檢視，為刻印樣式圖；尚無足夠證據判定原作者留檔用途，保留原位置。
- 其他舊位置僅為原程式內部使用，本次更新全部已找到的引用；未建立靜態圖片 runtime redirect。
- 遠端官方、Wiki、代理、blob／data URL 不納入搬移。
