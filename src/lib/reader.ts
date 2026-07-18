// 閱讀偏好(字級/白話隱藏)存 localStorage tcm.reader.v1;以 <html> class 生效。
// Base.astro 有同邏輯嘅 head inline script 防 FOUC —— 改 class 名兩邊要同步。

export type FontScale = 's' | 'm' | 'l'

export interface ReaderPrefs {
  fontScale: FontScale   // s=100% m=109.375%(預設) l=120%
  hideBaihua: boolean    // 原文自測模式:摺埋白話,逐段撳先開
}

const KEY = 'tcm.reader.v1'
const DEFAULT_PREFS: ReaderPrefs = { fontScale: 'm', hideBaihua: false }

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function getReaderPrefs(): ReaderPrefs {
  const s = storage()
  if (!s) return { ...DEFAULT_PREFS }
  try {
    const raw = s.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>
    return {
      fontScale: parsed.fontScale === 's' || parsed.fontScale === 'l' ? parsed.fontScale : 'm',
      hideBaihua: parsed.hideBaihua === true,
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function setReaderPrefs(prefs: ReaderPrefs): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // 靜默失敗
  }
  applyReaderPrefs(prefs)
}

/** 將偏好應用到 <html> class(font-s/font-l、hide-baihua)。 */
export function applyReaderPrefs(prefs: ReaderPrefs = getReaderPrefs()): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  el.classList.toggle('font-s', prefs.fontScale === 's')
  el.classList.toggle('font-l', prefs.fontScale === 'l')
  el.classList.toggle('hide-baihua', prefs.hideBaihua)
}
