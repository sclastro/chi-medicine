# CLAUDE.md

給未來在這個 repo 工作的 Claude 的指引。本檔記錄專案的架構、慣例與當前進度。

## 專案概覽

一個面向香港中醫初學者的**中醫經典學習網站**（岐黃入門），為準備入讀中大中醫學學士（BCM）課程的學生打底：
中醫基礎理論導覽、《黃帝內經·素問》名篇文白對讀（＋難字註＋粵語朗讀）、術語辭典、延伸資源導航、自測問答卡。
定位：坊間全是「資料庫」，本站做「零基礎學習路徑」——板塊次序對應 BCM 課程（基礎理論→Year 1、內經選讀→Year 2–3 預習）。
使用者介面文字一律用**書面語（標準書面中文）**，不用廣東話書面語。

- 技術棧：Astro 5（static output + Vercel adapter）+ React 19 islands + TypeScript + Tailwind CSS v4 + Vitest + Pagefind
- 姊妹項目：`sclastro/changes`（《易經》站，Vite SPA）——TTS/版式慣例源自該站

## 指令

```bash
npm run dev      # 本地開發 (astro dev)
npm run build    # astro check && astro build && pagefind --site dist —— 提交前必須零錯誤
npm test         # vitest run —— 資料完整性測試,全部須綠
npm run lint     # oxlint src
```

## 目錄結構

```
src/
  types/tcm.ts            所有型別(單一真相來源)
  data/
    suwen.json            素問:81 篇全目;sections 非空 = 已收錄,空 = 目錄標「待補」
    foundations.json      基礎理論 8 主題(自撰白話)
    glossary.json         術語辭典
    index.ts              資料存取:getBook/getChapter/getTopic/isChapterReady/isTopicReady
    data.test.ts          資料完整性測試(篇次/id/refs 有效性/粵拼格式/難字在原文)
  lib/tts/                朗讀三層鏈(見下)
  components/
    SectionReader.astro   文白對讀一段:原文(+朗讀掣)→難字註→白話(border-l-2 border-amber-100)
    react/                islands:SpeakButton/TtsSettings/QuizCards/GlossarySearch
  layouts/Base.astro      nav(基礎/經典/辭典/資源/進度/搜尋) + TtsSettings 齒輪 + footer
  pages/
    index.astro           首頁:BCM 入學前路線圖(四步)
    foundations/          基礎理論總覽 + [topic] 單題頁
    classics/             書目 + suwen/ 81 篇目錄 + [chapter] 單篇頁
    glossary.astro        辭典(GlossarySearch island)
    resources.astro       延伸資源導航(ctext/浸大數據庫/中大平台,註明「幾時用得着」)
    progress.astro        進度/書籤(批次 6,現為空殼)
    search.astro          Pagefind 全文搜尋(dev 模式優雅降級)
    api/tts.ts            Poe API 朗讀代理(prerender=false → Vercel function)
```

## 朗讀三層鏈（`lib/tts/`）

```
speak(id,text) → ①Poe 高質朗讀(經 /api/tts) → ②失敗即 markPoeDegraded(24h 冷靜期)
              → ③內建 Web Speech 粵語兜底(承襲易經站 speech.ts)
```

- **`/api/tts`**：`POE_API_KEY` 只存 Vercel 環境變數，永不落前端。Poe 用 OpenAI 相容
  API（`api.poe.com/v1` chat completions），TTS model 回覆內文附音頻 URL，代理取回串流返俾客戶端。
  可調 env：`POE_TTS_MODEL`（預設 `elevenlabs-v3`，支援粵語）、`POE_TTS_PROMPT_PREFIX`（語音指示前綴）。
- **降級語義**：客戶端見 5xx（含 503 未設 key、502 上游拒絕/key 過期）即入冷靜期；期間直接用內建語音，
  唔會每句白等 API。冷靜期過自動重試一次；設定面板有手動「重試」。**key 幾個月後到期 → 自動長期退內建，網站不壞。**
- **IndexedDB 音頻快取**（db `tcm-tts-cache`）：key = sha256(text)。古文靜態，同段文字只叫一次 API。
- 偏好存 localStorage `tcm.tts.v1`：`{ engine:'auto'|'builtin', voiceURI, rate }`；降級狀態 `tcm.tts.degraded.v1`。
- 單例協調：同一時間只播一句，以 id 標示當前播放項（`speak.ts` 統一 subscribe/notify）。

## 慣例

- **資料即真相**：`src/data/*.json` 為內容來源；UI 一律以存在性判斷包裹，內容分批補時優雅降級
  （sections 空 → 目錄「待補」灰卡/詳情「整理中」；`[chapter].astro` 只為 ready 篇章 getStaticPaths）。
- **原文 vs 白話**：古籍原文屬公共領域，對 ctext.org 通行本校對準確；白話與難字註為 AI 草擬＋人審。
  `contentStatus` 僅供資料層追蹤，**UI 不顯示任何 AI/草稿標示**。
- **文白對讀 = 直排**（手機優先，絕不用雙欄左右對照）：每段「原文（朗讀掣）→ 難字註（小字橫排）→ 白話
  （`pl-3 border-l-2 border-amber-100`）」。長篇按語意切段，每段自成一個 section。
- **難字註**：每段揀 3–5 個難字 `{char, jyutping, meaning}`；jyutping 格式 `^[a-z]+[1-6]$`（多字空格分隔）；
  char 必須出現在該段 original（有測試把關）。
- **Tailwind 色系**：主色 amber-800/900、淺底 amber-50；中性 gray-*；卡片
  `rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50`；容器 `max-w-3xl mx-auto px-4`；分段 `mb-8`。
- **導覽次序**：路線圖(首頁) → 基礎 → 經典 → 辭典 → 資源 → 進度（先明理、後讀經、隨時查）。
- **localStorage key**：TTS `tcm.tts.v1`；進度（批次 6）`tcm.progress.v1`。

## Git 工作流

- 開發分支：`claude/chi-medicine-resource-b682tq`；`git push -u origin <branch>`，網絡錯誤指數退避重試（2s/4s/8s/16s）
- 只推指定分支；`main`/Vercel 接駁由用戶決定（用戶須在 Vercel dashboard 設 `POE_API_KEY`）
- 提交訊息用中文、描述具體變更
- ⚠ 不要在 commit / PR / 程式碼註解放入模型識別碼

## 內容路線（已與用戶確定）

- **素問選讀批一（8 篇）**：上古天真論1、四氣調神大論2、生氣通天論3、金匱真言論4、陰陽應象大論5、
  靈蘭秘典論8、六節藏象論9、五藏別論11
- **批二（10 篇）**：五藏生成10、異法方宜論12、湯液醪醴論14、脈要精微論17、經脈別論21、寶命全形論25、
  舉痛論39、風論42、痺論43、痿論44
- **基礎理論 8 篇**對齊中大 60h「中醫學基礎入門」課程比重（基礎理論 18h＋診斷辨證 18h —— 故「診法與辨證入門」
  涵蓋四診＋八綱辨證，日後擴充臟腑辨證）
- 中藥/方劑（Year 2）**外連不自建**（浸大數據庫世界級），見 resources.astro
- 時間表：用戶兒子今年 9 月入學，批次 1–3（骨架/基礎理論/素問批一）為開學前必達

## 進度

- **批次 1（骨架）**：本批 —— Astro scaffold、型別、資料層+測試、TTS 三層鏈、全部頁面、Pagefind、favicon
- 批次 2：基礎理論 8 篇內容＋quiz（進行中/待做）
- 批次 3：素問批一 8 篇（原文校對＋白話＋難字註＋導讀＋quiz）
- 批次 4：素問批二 10 篇；批次 5：辭典＋資源頁充實;批次 6：進度/書籤（lib/progress.ts 型別已備）
