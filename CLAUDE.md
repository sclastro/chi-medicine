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
    suwen.json            素問:81 篇全數收錄;featured = 精選 18 篇(標「基礎」);image = 篇首 3:2 圖
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
public/images/
  home-hero.webp          首頁橫幅(16:9)
  foundations/            基礎理論:<id>.webp(3:2 banner)+<id>-thumb.webp(1:1 縮圖)
  classics/               素問:suwen.webp(書目頁)+<chapter-id>.webp(篇首,精選 18 篇)
opus-output/              Opus 翻譯輸出 JSON(已套用網頁;18 篇 A 審校版留檔未採用)
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
  素問現時 81 篇全部非空，「待補」機制保留備日後加入靈樞/傷寒論等新書時再用。
- **原文 vs 白話**：古籍原文屬公共領域，對 ctext.org 通行本校對準確；白話與難字註為 AI 草擬＋人審。
  `contentStatus` 僅供資料層追蹤，**UI 不顯示任何 AI/草稿標示**。
- **文白對讀 = 直排**（手機優先，絕不用雙欄左右對照）：每段「原文（朗讀掣）→ 難字註（小字橫排）→ 白話
  （`pl-3 border-l-2 border-amber-100`）」。長篇按語意切段，每段自成一個 section。
- **難字註**：每段揀 3–5 個難字 `{char, jyutping, meaning}`；jyutping 格式 `^[a-z]+[1-6]$`（多字空格分隔）；
  char 必須出現在該段 original（有測試把關）。
- **圖片**：一律 **WebP**（絕不入 PNG —— 原 PNG 每幅 1.5MB，轉檔後 25.2MB → 0.77MB，減 97%）。
  按版面實際顯示尺寸縮闊度（2x 為度）：banner/篇首圖 **1024px（3:2）**、方形縮圖 **256px（1:1）**、首頁 hero 1376px（16:9）。
  頁面統一 `w-full max-w-lg mx-auto rounded-lg mb-5`，擺喺標題**之上**（基礎理論、素問書目頁、素問篇首一致）。
  生成見下「POE 生圖」；壓縮腳本 `scratchpad/optimize_images.cjs`。
- **精選 18 篇**：`featured: true`（批一 8＋批二 10）＝ 建議入門先讀，目錄與章節頁以琥珀細標「基礎」標示；
  精選名單改動只需改 JSON，template 唔寫死。篇首圖亦只做呢 18 篇。
- **Tailwind 色系**：主色 amber-800/900、淺底 amber-50；中性 gray-*；卡片
  `rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50`；容器 `max-w-3xl mx-auto px-4`；分段 `mb-8`。
- **導覽次序**：路線圖(首頁) → 基礎 → 經典 → 辭典 → 資源 → 進度（先明理、後讀經、隨時查）。
- **localStorage key**：TTS `tcm.tts.v1`；進度/書籤/lastRead `tcm.progress.v1`；閱讀偏好(字級/白話隱藏) `tcm.reader.v1`
  （Base.astro head 有防 FOUC inline script,同 `lib/reader.ts` 嘅 html class 名必須同步）；問答卡未熟 `tcm.quiz.v1`。

## POE API 工作流（翻譯／生圖）

用戶提供機構 POE key（存 `scratchpad/.poe_key`，600 權限，**永不入 repo／永不落 command line**，經 env 傳 curl）。
原則：**重活喺 POE 嗰邊做，本 session 只做管道**（組 prompt → 送 → 收 → 存檔），唔好將大量內容帶入對話。

- **翻譯**（`scratchpad/opus_translate.cjs`｜超長篇用 `opus_chunked.cjs`）：model `Claude-Opus-4.8`。
  超長篇按段切 chunk（~1800 字）逐批送、合併；**逐字校驗**輸出各段 original 串接 === 笈成底本，一字不符即人手核。
  Opus 偶會漏句／改標點（實測 73 漏一句、71 標點），故校驗不可省。輸出存 `opus-output/<id>.json`。
- **生圖**（`scratchpad/gen_classic_img.cjs`）：model **`nano-banana-pro`**（Gemini 家族，同原有 8 幅畫風一致）。
  比例用 **`--aspect 3:2`** 附喺 prompt 尾 —— 舊 `nano-banana` 鎖死 1:1，`nano-banana-pro` 同 `ideogram-v3` 實測都食到；
  flux/seedream 唔理。實際出 1264×848。
  **prompt 由 `suwen.json` 嘅 title + intro 自動組**（唔使人手逐篇讀內容，慳 token）。
  ⚠ POE 新 CDN 嘅圖片 URL **冇副檔名**（`...?w=&h=`），抽 URL 唔可以靠 `\.png` match。
  下載後即以 sharp 縮尺寸＋轉 WebP 先入庫；已存在檔案自動 skip（斷咗可續跑）。
- **點數**：翻譯／生圖都燒點。跑爆會回 `insufficient_quota`；腳本見此即乾淨停低（唔重試白燒），
  已生成部分保住，補返點數後再跑會跳過已完成項。

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
- 批一＋批二 ＝ **精選 18 篇**（`featured`，UI 標「基礎」、有篇首圖）＝ 大仔開學前先讀嗰批。
  其餘 63 篇已於批次 9 全數補齊（81/81），屬延伸閱讀，唔標「基礎」、暫無篇首圖。
- **基礎理論 8 篇**對齊中大 60h「中醫學基礎入門」課程比重（基礎理論 18h＋診斷辨證 18h —— 故「診法與辨證入門」
  涵蓋四診＋八綱辨證，日後擴充臟腑辨證）
- 中藥/方劑（Year 2）**外連不自建**（浸大數據庫世界級），見 resources.astro
- 時間表：用戶兒子今年 9 月入學，批次 1–3（骨架/基礎理論/素問批一）為開學前必達

## 進度

- **批次 1（骨架）完成**：Astro scaffold、型別、資料層+測試、TTS 三層鏈、全部頁面、Pagefind、favicon
- **批次 2 完成**：基礎理論 8 篇內容＋quiz 43 條＋refs 待補優雅降級；全站字體加大(基準 17.5px、原文 text-xl)
- **批次 3 完成**：素問批一 8 篇全數入庫(1/2/3/4/5/8/9/11,共 ~8700 字原文、102 段文白對讀+難字註+導讀+quiz)
  - **原文底本**:中醫笈成(jicheng.tw,顧從德翻刻宋本+今版標點),整頁 HTML 內含全書,以 scratchpad `gen_suwen`/抽取腳本取篇、剔除卷末音釋、規範用字(臟→藏、其谷→穀、云→雲、咸→鹹等,向 ctext 靠齊),曾以 ctext 抽查對照
  - **內容注入流程**:spec 檔(`scratchpad/spec_NN.cjs`)以「切點標記」切原文(唔重新打字),`apply_suwen.cjs` 逐字校驗(切段串接===底本)+難字在段內檢查後先寫入 suwen.json。**補批二(10/12/14/17/21/25/39/42/43/44)沿用此流程**,底本 HTML 在 scratchpad `jc_index.html`(冇咗可重新 curl)
- **批次 4 完成**：素問批二 10 篇(10/12/14/17/21/25/39/42/43/44)全數入庫,共 18/81 篇、~18000 字原文、245 段文白對讀;流程同批一(spec_NN.cjs+apply_suwen.cjs 逐字校驗)
- **批次 5 完成**：辭典 114 條(七大分類:陰陽五行/藏象/氣血津液/經絡/病因病機/診法辨證/治則養生,refs 連原文,生成腳本 scratchpad/gen_glossary.cjs);資源頁補醫砭+A+醫學百科
- **批次 6 完成**：進度/書籤 —— `lib/progress.ts`(tcm.progress.v1,含單元測試)、篇末 ReadToggle、每段 BookmarkButton(錨點 `#s<idx>`)、`/progress` 頁 ProgressView(已讀統計+進度條+書籤跳轉)
- **批次 7 完成**（閱讀體驗）:speak.ts 完成回調(speakItem→ended/interrupted)+ChapterPlayer 全篇連續朗讀(高亮跟蹤;
  支援暫停/續播記段序+屏幕底浮動控制列;個別朗讀掣打斷序列時自動轉為暫停);
  AnnotationChips 難字點讀;原文自測模式(hide-baihua+逐段展開);字級調節;繼續閱讀入口(lastRead)+返頂浮掣
- **批次 8 完成**（溫習）:QuizCards「已掌握/未熟」(tcm.quiz.v1,cardId=ownerId:index)+進度頁「待重溫」;
  金句背誦 /recite(quotes.json 43 句,測試逐字校驗係原文子串,生成腳本 scratchpad/gen_quotes.cjs)
- **批次 9 完成**（素問全譯，經 POE Opus）:由 18/81 補到 **81/81 篇全數收錄**。
  A 審校 18 篇已收錄篇 + B 新譯 63 篇待補篇,全部原文對笈成底本逐字校驗;
  超長 6 篇(69/70/71/72/73/74,最長 71 篇 327 段)以 chunk 分批生成合併。
  套用腳本 `scratchpad/apply_opus.cjs`(丟棄越段/格式不合難字後先寫入)。
  ⚠ **18 篇 A 審校改善版用戶決定唔採用**,保留原有白話;檔案留喺 `opus-output/` 備查。
- **批次 10 完成**（圖片）:精選 18 篇加篇首 3:2 意境圖 + 素問書目頁 1 幅(共 19 幅,經 POE nano-banana-pro);
  目錄/章節頁加「基礎」細標(featured);全站圖片轉 WebP 並按版面縮尺寸(25.2MB → 0.77MB,減 97%)。
- **十批全部完成**。日後方向:靈樞/傷寒論選讀、臟腑辨證加入基礎理論、辭典隨篇章增補、
  其餘 63 篇篇首圖(如需)、暗黑模式/PWA(用戶未選)
- 白話/難字註全部 `contentStatus:'draft'`,人審後改 reviewed;UI 不顯示標示
