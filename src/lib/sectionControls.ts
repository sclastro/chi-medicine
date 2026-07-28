// 段落互動控制器:以「一個事件代理」取代每段 3 個 React island。
// 對應 SectionReader.astro 嘅靜態掣:.speak-btn / .bookmark-btn / .ann-speak。
// (.play-from 同 .baihua-reveal 喺 [chapter].astro 嘅 script 處理,因為要同 ChapterPlayer 通訊。)
//
// 點解唔用 island:71 篇有 327 段,每段 3 個 island = ~1000 個 island + 重複序列化原文,
// 單頁 HTML 去到 1.5MB。改代理後同一頁只餘 ChapterPlayer 一個 island。
import { getCurrentId, isTtsSupported, speak, stop, subscribe } from './tts/speak'
import { isBookmarked, toggleBookmark } from './progress'

const ACTIVE = ['bg-amber-700', 'text-white']
const IDLE = ['text-amber-700', 'hover:bg-amber-100']

function setSpeakActive(btn: HTMLElement, active: boolean) {
  btn.classList.toggle('opacity-50', false)
  ACTIVE.forEach(c => btn.classList.toggle(c, active))
  IDLE.forEach(c => btn.classList.toggle(c, !active))
  btn.setAttribute('aria-pressed', String(active))
  btn.setAttribute('aria-label', active ? '停止朗讀' : '粵語朗讀')
  btn.setAttribute('title', active ? '停止' : '粵語朗讀')
  // 聲波動畫(同 SpeakButton 舊版一致)
  btn.querySelector('.wave-1')?.classList.toggle('speak-wave', active)
  const w2 = btn.querySelector('.wave-2')
  w2?.classList.toggle('speak-wave', active)
  w2?.classList.toggle('speak-wave-2', active)
}

function setBookmarked(btn: HTMLElement, marked: boolean) {
  btn.classList.toggle('text-amber-700', marked)
  btn.classList.toggle('text-gray-400', !marked)   // 同 SectionReader 嘅 idle 色一致
  btn.classList.toggle('hover:text-amber-600', !marked)
  btn.classList.toggle('hover:bg-amber-50', !marked)
  btn.setAttribute('aria-pressed', String(marked))
  btn.setAttribute('aria-label', marked ? '移除書籤' : '加入書籤')
  btn.setAttribute('title', marked ? '移除書籤' : '加入書籤')
  const path = btn.querySelector('svg')
  if (path) path.setAttribute('fill', marked ? 'currentColor' : 'none')
}

/** 喺章節頁初始化。回傳解除函式(SPA 導航時可用;現時多頁架構唔需要)。 */
export function initSectionControls(): () => void {
  // TTS 唔支援就收起朗讀掣(同舊 SpeakButton 行為一致:直接唔顯示)
  if (!isTtsSupported()) {
    document.querySelectorAll<HTMLElement>('.speak-btn, .ann-speak').forEach(el => {
      if (el.classList.contains('speak-btn')) el.style.display = 'none'
    })
  }

  // 書籤:載入時回填狀態(localStorage 只喺客戶端有)
  document.querySelectorAll<HTMLElement>('.bookmark-btn').forEach(btn => {
    const ch = btn.dataset.chapter
    const idx = Number(btn.dataset.index)
    if (ch && Number.isInteger(idx)) setBookmarked(btn, isBookmarked(ch, idx))
  })

  // 朗讀狀態:單例協調,同一時間只有一個掣係 active
  const applySpeaking = (id: string | null) => {
    document.querySelectorAll<HTMLElement>('.speak-btn').forEach(btn => {
      setSpeakActive(btn, btn.dataset.speakId === id)
    })
  }
  applySpeaking(getCurrentId())
  const unsubscribe = subscribe(applySpeaking)

  const onClick = (e: Event) => {
    const target = e.target as Element | null

    // 段落朗讀:原文由 DOM 攞(唔再序列化落 props)
    const speakBtn = target?.closest<HTMLElement>('.speak-btn')
    if (speakBtn) {
      const id = speakBtn.dataset.speakId
      if (!id) return
      if (getCurrentId() === id) {
        stop()
        return
      }
      const text = speakBtn.closest('[data-section]')?.querySelector('.section-original')?.textContent ?? ''
      if (text) {
        speakBtn.classList.add('opacity-50')
        void speak(id, text).finally(() => speakBtn.classList.remove('opacity-50'))
      }
      return
    }

    // 難字點讀
    const ann = target?.closest<HTMLElement>('.ann-speak')
    if (ann) {
      const id = ann.dataset.speakId
      const char = ann.dataset.char
      if (id && char) void speak(id, char)
      return
    }

    // 書籤
    const bm = target?.closest<HTMLElement>('.bookmark-btn')
    if (bm) {
      const ch = bm.dataset.chapter
      const idx = Number(bm.dataset.index)
      if (ch && Number.isInteger(idx)) setBookmarked(bm, toggleBookmark(ch, idx))
    }
  }

  document.addEventListener('click', onClick)
  return () => {
    document.removeEventListener('click', onClick)
    unsubscribe()
  }
}
