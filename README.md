# 半熟漢堡工作室 ｜ Half Humble Design Studio

> Building intentional layers · 層層堆疊，恰好的熟度。

工作室作品集網站。以「客戶體驗」為主軸，靈感取自 Transform Design 的工作室結構與 The Whisper 的 cinematic 互動細節。視覺色系與品牌 mark 取自工作室名片實際品牌資產。

## 結構

```
site/
├── index.html              首頁（Hero / Marquee / Featured Work / Services / Process / Clients / Enquiry）
├── work.html               全部作品（Featured/All Work 切換 + 多標籤過濾）
├── service.html            服務範疇（5 條服務線、報價區間、合作流程）
├── about.html              品牌哲學（半熟｜漢堡、信念、客戶類型、創辦人）
├── contact.html            三條聯絡路徑 + 工作室資訊
├── works/
│   └── liang-chuan.html    案例內頁範本（七段式：Context → Reflection）
├── styles.css              全站樣式
├── main.js                 互動：cursor、loader、reveal、marquee、filter、magnetic
└── works.html              舊路徑，自動跳轉到 work.html
```

## 設計系統

**色彩（取自名片實際品牌色）**

- `--paper: #F2EDD9` — 暖奶油白（名片底色）
- `--ink: #1A1F3B` — 深 indigo 黑（body 文字）
- `--indigo: #3B4FA7` — 主品牌藍（HALF 區塊主色，italic em、CTA hover、stat 數字、process step）
- `--signal: #E25C49` — 半熟烤痕橘紅（dot、coral 強調、marquee）
- `--yolk: #ED8E2E` — 半熟蛋黃（深色區強調、enquiry em）
- `--olive: #9CA64A` — 名片綠線（marquee 第三色）
- `--gold: #C29752` — 名片金字（保留備用）

**字體**

- 英文：**TASA Orbiter**（Google Fonts CDN，含 weight 400/500/700/900 + italic + Display）
- 中文：**LINE Seed TW**（LINE 釋出的繁體中文黑體，免費商用，從 jsdelivr CDN 自動載入）
- 等寬：DM Mono（小標、tag、編號，Google Fonts）

字體哲學：黑體（sans-serif）凸顯專業現代感；TASA Orbiter 在英文上提供細節與性格，LINE Seed TW 在中文上提供穩定的閱讀感。**全部從 CDN 載入，無需自托管字體檔案。**

**Brand Mark**

呼應名片上的笑臉角色——半圓的麵包頭頂 + 雙眼 + 微笑的 SVG 角色，於 header 與 loader 使用同一個 mark。

## 互動細節

| 互動 | 在哪 | 說明 |
|---|---|---|
| Page Loader | 全站 | 進站時 indigo curtain 顯示半熟笑臉 mark，1 秒後上滑離開 |
| Custom Cursor | 桌面版 | 黑點 cursor，在連結上放大為 indigo 圓，在作品卡上變成 indigo "view" 字樣 |
| Header Shrink | 全站 | 滾動 40px 後 header 縮小、加米色霧化 |
| Hero Line-up | 首頁 | "We design / behavior, / not just visuals." 三行依序從下方推上來 |
| Marquee Ticker | 首頁 | 服務名稱無限橫向滾動，dot 交錯三色，hover 暫停 |
| Cinematic Reveal | 全站 | Work card 進場時 clip-path 從右往左揭開圖片 |
| Hover Cards | 全站 | 圖片 zoom 1.04、底部疊上半透明黑漸層 + 「View case」徽章 |
| Section Bar 色塊 | 全站 | 段落分隔線左端用 indigo + coral 雙色塊延伸（呼應名片色塊感） |
| Service indigo 線 | Service 區 | hover 時左側出現一條 4px indigo 線從上展開 |
| Magnetic CTA | 主要按鈕 | 滑鼠靠近時按鈕往 cursor 方向輕微吸引 |
| Filter | Work 頁 | Featured/All 切換 + 7 個 tag chip 即時過濾 |
| Reduce Motion | 全站 | 系統設定為「減少動畫」時自動關閉 |

## 怎麼預覽

雙擊 `index.html` 即可。或：

```bash
cd site
python -m http.server 8000
# 開 http://localhost:8000
```

## 如何替換成你自己的內容

| 想改的 | 改哪裡 |
|---|---|
| 工作室 email | 全站搜尋 `hello.halfhumble@gmail.com` |
| Brand mark 笑臉 | `styles.css` 的 `.brand-mark` 與 `.loader-mark` SVG mask |
| 案例縮圖 | 把 `<div class="placeholder">…</div>` 換成 `<img src="..." alt="...">` |
| 新案例頁 | 複製 `works/liang-chuan.html`，改檔名與內容 |
| 服務報價 | `service.html` 的 `.fee` 區塊 |
| 合作客戶 | `index.html` 底部 `.clients-strip` |
| 主品牌色 | `styles.css` 的 `--indigo`（建議跟著名片印刷色微調） |

## 部署

直接拖 `site/` 整個資料夾到 [Vercel](https://vercel.com) / [Netlify](https://netlify.app)，純靜態，無 build。

---

© 2026 半熟漢堡工作室 Half Humble Design Studio
