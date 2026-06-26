# Fonts

兩種字體都從 CDN 載入，**這個資料夾不需要任何檔案**——保留只是備用。

## TASA Orbiter（英文）

從 **Google Fonts** 載入。HTML 的 `<link>` 已經設好。
- https://fonts.google.com/specimen/TASA+Orbiter

## LINE Seed TW（中文）

從 **jsdelivr CDN** 載入 LINE 官方 GitHub repo 的字體檔，定義在 `styles.css` 頂端的 `@font-face`。
- https://www.linecorp.com/zh-hant/seed
- https://github.com/line/line-seed-tw

## 如果想自托管（提速 / 離線部署）

下載 woff2 檔案放進這個資料夾，把 `styles.css` 與 HTML link 的 src 改成相對路徑即可。
