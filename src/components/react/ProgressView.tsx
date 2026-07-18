import { useEffect, useState } from 'react'
import type { ProgressStore } from '../../types/tcm'
import { getProgress, removeBookmark, toggleRead } from '../../lib/progress'

interface ChapterInfo {
  id: string
  number: number
  title: string
}

interface Props {
  /** 已收錄(可閱讀)嘅篇章,依篇次排序 */
  chapters: ChapterInfo[]
}

/** 進度頁:已讀統計 + 書籤列表(可跳返原段)。資料全在 localStorage。 */
export function ProgressView({ chapters }: Props) {
  const [store, setStore] = useState<ProgressStore | null>(null)

  useEffect(() => {
    setStore(getProgress())
  }, [])

  if (!store) return null

  const byId = new Map(chapters.map(c => [c.id, c]))
  const readCount = chapters.filter(c => c.id in store.read).length

  const onToggleRead = (id: string) => {
    toggleRead(id)
    setStore(getProgress())
  }

  const onRemoveBookmark = (chapterId: string, sectionIndex: number) => {
    removeBookmark(chapterId, sectionIndex)
    setStore(getProgress())
  }

  return (
    <div>
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-amber-900">素問選讀進度</h2>
          <span className="text-sm text-gray-500">{readCount}／{chapters.length} 篇已讀</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div
            className="h-full bg-amber-600 transition-all"
            style={{ width: chapters.length ? `${(readCount / chapters.length) * 100}%` : '0%' }}
          />
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {chapters.map(c => {
            const read = c.id in store.read
            return (
              <li key={c.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleRead(c.id)}
                  aria-label={read ? `取消 ${c.title} 已讀` : `標記 ${c.title} 已讀`}
                  aria-pressed={read}
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-colors ${
                    read ? 'text-amber-700' : 'text-gray-300 hover:text-amber-600'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                </button>
                <a
                  href={`/classics/suwen/${c.id}`}
                  className={`text-sm hover:text-amber-800 hover:underline ${read ? 'text-gray-400' : 'text-gray-700'}`}
                >
                  <span className="text-xs text-amber-700 mr-1.5">{c.number}</span>
                  {c.title}
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-amber-900 mb-3">書籤</h2>
        {store.bookmarks.length ? (
          <ul className="space-y-2">
            {store.bookmarks
              .slice()
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .map(b => {
                const ch = byId.get(b.chapterId)
                return (
                  <li key={`${b.chapterId}-${b.sectionIndex}`} className="flex items-center gap-2">
                    <a
                      href={`/classics/suwen/${b.chapterId}#s${b.sectionIndex}`}
                      className="flex-1 text-sm text-gray-700 hover:text-amber-800 hover:underline"
                    >
                      {ch ? `${ch.title}` : b.chapterId} · 第 {b.sectionIndex + 1} 段
                    </a>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(b.chapterId, b.sectionIndex)}
                      aria-label="移除書籤"
                      title="移除書籤"
                      className="text-gray-300 hover:text-amber-700 w-6 h-6 inline-flex items-center justify-center"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </li>
                )
              })}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">
            未有書籤。閱讀時點段落旁的書籤圖示,重點段落會收藏在此。
          </p>
        )}
      </section>
    </div>
  )
}
