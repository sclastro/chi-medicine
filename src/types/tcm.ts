// 全站型別 —— 單一真相來源。
// 資料即真相:內容存 src/data/*.json,UI 一律以存在性判斷包裹,分批補內容時優雅降級。

export type ContentStatus = 'draft' | 'reviewed'

/** 難字註:針對零基礎讀古文(對應中大 BCM Year 1「古文導讀」)。 */
export interface Annotation {
  char: string      // 單字或雙字詞
  jyutping: string  // 粵拼,如 "seoi1";多字以空格分隔
  meaning: string   // 字義(書面語,精簡)
}

/** 文白對讀嘅最小閱讀段:原文必有,白話/難字註分批補。 */
export interface Section {
  original: string
  baihua?: string
  annotations?: Annotation[]
  contentStatus?: ContentStatus
}

/** 自測問答卡(翻牌式)。 */
export interface QuizItem {
  question: string
  answer: string
}

/** 指向某部經典某一篇嘅內部連結。 */
export interface ClassicRef {
  bookId: string    // 'suwen'
  chapterId: string // 'suwen-05'
  label: string     // 顯示文字,如「素問·陰陽應象大論」
}

/** 經典嘅一篇(素問每篇一頁)。sections 為空 = 內容待補,目錄顯示但不可進入。 */
export interface ClassicChapter {
  id: string        // 'suwen-01'
  number: number    // 篇次 1–81
  title: string     // 上古天真論
  intro?: string    // 白話導讀:本篇宗旨、點解重要
  sections: Section[]
  quiz?: QuizItem[]
}

export interface ClassicBook {
  id: string        // 'suwen'(日後 'lingshu'|'shanghan'|...)
  title: string     // 黃帝內經·素問
  order: number
  intro: string
  chapters: ClassicChapter[]
}

/** 基礎理論導覽主題(自撰白話,對應中大 BCM 科目)。 */
export interface FoundationTopic {
  id: string        // 'yinyang'
  title: string     // 陰陽學說
  order: number
  courseRef: string // 對應科目,如「中醫基礎理論(Year 1)」
  intro: string
  sections: {
    heading: string
    body: string
    refs?: ClassicRef[]
  }[]
  quiz?: QuizItem[]
}

/** 中醫術語辭典條目。 */
export interface GlossaryTerm {
  term: string
  category: string  // 陰陽五行/藏象/氣血津液/經絡/病因病機/診法/其他
  definition: string
  refs?: ClassicRef[]
}

// ─── 閱讀進度/書籤(localStorage tcm.progress.v1,批次 6) ───

export interface Bookmark {
  chapterId: string
  sectionIndex: number
  note?: string
  timestamp: string // ISO
}

export interface ProgressStore {
  schemaVersion: 1
  read: Record<string, string> // chapterId → ISO timestamp
  bookmarks: Bookmark[]
}
