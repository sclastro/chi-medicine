import { useEffect, useState } from 'react'
import { isRead, toggleRead } from '../../lib/progress'

interface Props {
  chapterId: string
}

/** 篇末「標記為已讀」掣;進度頁按此統計。 */
export function ReadToggle({ chapterId }: Props) {
  const [read, setRead] = useState(false)

  useEffect(() => {
    setRead(isRead(chapterId))
  }, [chapterId])

  return (
    <button
      type="button"
      onClick={() => setRead(toggleRead(chapterId))}
      aria-pressed={read}
      className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border transition-colors ${
        read
          ? 'bg-amber-800 border-amber-800 text-white hover:bg-amber-700'
          : 'border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-800'
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {read ? '已讀完本篇' : '標記為已讀'}
    </button>
  )
}
