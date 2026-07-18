// progress.ts 單元測試:以記憶體 stub 模擬 localStorage。
import { beforeEach, describe, expect, it } from 'vitest'
import { getBookmarks, getProgress, isBookmarked, isRead, toggleBookmark, toggleRead } from './progress'

function stubStorage() {
  const map = new Map<string, string>()
  const stub = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size
    },
  } as unknown as Storage
  ;(globalThis as Record<string, unknown>).window = { localStorage: stub }
}

describe('progress', () => {
  beforeEach(stubStorage)

  it('初始為空', () => {
    const p = getProgress()
    expect(p.read).toEqual({})
    expect(p.bookmarks).toEqual([])
  })

  it('toggleRead 標記/取消已讀', () => {
    expect(toggleRead('suwen-01')).toBe(true)
    expect(isRead('suwen-01')).toBe(true)
    expect(toggleRead('suwen-01')).toBe(false)
    expect(isRead('suwen-01')).toBe(false)
  })

  it('toggleBookmark 加/除書籤', () => {
    expect(toggleBookmark('suwen-05', 3)).toBe(true)
    expect(isBookmarked('suwen-05', 3)).toBe(true)
    expect(getBookmarks()).toHaveLength(1)
    expect(toggleBookmark('suwen-05', 3)).toBe(false)
    expect(getBookmarks()).toHaveLength(0)
  })

  it('損壞資料時優雅回空', () => {
    window.localStorage.setItem('tcm.progress.v1', '{oops')
    const p = getProgress()
    expect(p.read).toEqual({})
    expect(p.bookmarks).toEqual([])
  })
})
