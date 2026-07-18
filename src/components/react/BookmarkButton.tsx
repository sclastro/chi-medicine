import { useEffect, useState } from 'react'
import { isBookmarked, toggleBookmark } from '../../lib/progress'

interface Props {
  chapterId: string
  sectionIndex: number
}

/** 段落書籤掣:標記重點段落,喺「進度」頁可以跳返嚟。 */
export function BookmarkButton({ chapterId, sectionIndex }: Props) {
  const [marked, setMarked] = useState(false)

  // localStorage 只在客戶端有;hydration 後先讀取
  useEffect(() => {
    setMarked(isBookmarked(chapterId, sectionIndex))
  }, [chapterId, sectionIndex])

  const onClick = () => {
    setMarked(toggleBookmark(chapterId, sectionIndex))
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={marked ? '移除書籤' : '加入書籤'}
      aria-pressed={marked}
      title={marked ? '移除書籤' : '加入書籤'}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors ${
        marked ? 'text-amber-700' : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={marked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
