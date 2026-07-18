// 閱讀進度/書籤:localStorage tcm.progress.v1 薄包裝(仿易經站 journal.ts,要換儲存層只改此檔)。
import type { Bookmark, ProgressStore } from '../types/tcm'

const KEY = 'tcm.progress.v1'

const EMPTY: ProgressStore = { schemaVersion: 1, read: {}, bookmarks: [] }

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function getProgress(): ProgressStore {
  const s = storage()
  if (!s) return { ...EMPTY, read: {}, bookmarks: [] }
  try {
    const raw = s.getItem(KEY)
    if (!raw) return { ...EMPTY, read: {}, bookmarks: [] }
    const parsed = JSON.parse(raw) as Partial<ProgressStore>
    return {
      schemaVersion: 1,
      read: parsed.read && typeof parsed.read === 'object' ? parsed.read : {},
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      ...(parsed.lastRead && typeof parsed.lastRead.chapterId === 'string'
        ? { lastRead: parsed.lastRead }
        : {}),
    }
  } catch {
    return { ...EMPTY, read: {}, bookmarks: [] }
  }
}

function save(store: ProgressStore): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(KEY, JSON.stringify(store))
  } catch {
    // 配額爆滿或私隱模式:靜默失敗
  }
}

export function isRead(chapterId: string): boolean {
  return chapterId in getProgress().read
}

export function toggleRead(chapterId: string): boolean {
  const store = getProgress()
  if (chapterId in store.read) {
    delete store.read[chapterId]
  } else {
    store.read[chapterId] = new Date().toISOString()
  }
  save(store)
  return chapterId in store.read
}

export function isBookmarked(chapterId: string, sectionIndex: number): boolean {
  return getProgress().bookmarks.some(
    b => b.chapterId === chapterId && b.sectionIndex === sectionIndex,
  )
}

export function toggleBookmark(chapterId: string, sectionIndex: number): boolean {
  const store = getProgress()
  const idx = store.bookmarks.findIndex(
    b => b.chapterId === chapterId && b.sectionIndex === sectionIndex,
  )
  if (idx >= 0) {
    store.bookmarks.splice(idx, 1)
    save(store)
    return false
  }
  store.bookmarks.push({
    chapterId,
    sectionIndex,
    timestamp: new Date().toISOString(),
  })
  save(store)
  return true
}

export function getBookmarks(): Bookmark[] {
  return getProgress().bookmarks.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

/** 記低最後閱讀嘅篇章(「繼續閱讀」入口用);開篇章頁時呼叫。 */
export function setLastRead(chapterId: string): void {
  const store = getProgress()
  store.lastRead = { chapterId, timestamp: new Date().toISOString() }
  save(store)
}

export function getLastRead(): { chapterId: string; timestamp: string } | null {
  return getProgress().lastRead ?? null
}

export function removeBookmark(chapterId: string, sectionIndex: number): void {
  const store = getProgress()
  store.bookmarks = store.bookmarks.filter(
    b => !(b.chapterId === chapterId && b.sectionIndex === sectionIndex),
  )
  save(store)
}
