import { useEffect, useState } from 'react'
import type { ProgressStore } from '../../types/tcm'
import { getProgress, removeBookmark, toggleRead } from '../../lib/progress'
import { clearUnknown, getUnknownMap } from '../../lib/quizprog'

interface ChapterInfo {
  id: string
  number: number
  title: string
}

export interface ReviewItem {
  /** cardId = `${ownerId}:${index}` */
  id: string
  source: string
  question: string
  answer: string
}

interface Props {
  /** 已收錄(可閱讀)嘅篇章,依篇次排序 */
  chapters: ChapterInfo[]
  /** 全站問答卡(供「待重溫」對照) */
  reviewItems?: ReviewItem[]
}

/** 進度頁:已讀統計 + 書籤列表(可跳返原段)。資料全在 localStorage。 */
export function ProgressView({ chapters, reviewItems = [] }: Props) {
  const [store, setStore] = useState<ProgressStore | null>(null)
  const [unknownIds, setUnknownIds] = useState<Set<string>>(new Set())
  const [openReview, setOpenReview] = useState<Set<string>>(new Set())

  useEffect(() => {
    setStore(getProgress())
    setUnknownIds(new Set(Object.keys(getUnknownMap())))
  }, [])

  if (!store) return null

  const reviewList = reviewItems.filter(r => unknownIds.has(r.id))

  const onMastered = (id: string) => {
    clearUnknown(id)
    setUnknownIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleReview = (id: string) => {
    setOpenReview(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-amber-900">待重溫問答卡</h2>
          {reviewList.length ? (
            <span className="text-sm text-gray-500">{reviewList.length} 張</span>
          ) : null}
        </div>
        {reviewList.length ? (
          <ul className="space-y-3">
            {reviewList.map(r => {
              const isOpen = openReview.has(r.id)
              return (
                <li key={r.id} className="rounded-lg border border-amber-200 bg-amber-50/40">
                  <button
                    type="button"
                    onClick={() => toggleReview(r.id)}
                    aria-expanded={isOpen}
                    className="block w-full text-left px-4 py-3"
                  >
                    <p className="text-xs text-amber-700 mb-1">{r.source}</p>
                    <p className="text-sm text-gray-800">
                      <span className="text-amber-800 font-semibold mr-2">問</span>
                      {r.question}
                    </p>
                    {isOpen ? (
                      <p className="text-sm text-gray-700 mt-2 pt-2 border-t border-amber-100">
                        <span className="text-amber-800 font-semibold mr-2">答</span>
                        {r.answer}
                      </p>
                    ) : null}
                  </button>
                  {isOpen ? (
                    <div className="px-4 pb-3">
                      <button
                        type="button"
                        onClick={() => onMastered(r.id)}
                        className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-800 transition-colors"
                      >
                        已掌握，移出重溫
                      </button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">
            未有待重溫的卡。做自測時標「未熟」的問答卡會集中在此。
          </p>
        )}
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
