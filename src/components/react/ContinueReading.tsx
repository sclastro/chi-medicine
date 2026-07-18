import { useEffect, useState } from 'react'
import { getLastRead } from '../../lib/progress'

interface ChapterInfo {
  id: string
  number: number
  title: string
}

interface Props {
  chapters: ChapterInfo[]
}

/** 「繼續閱讀」入口:顯示上次開過嘅篇章,一撳跳返。 */
export function ContinueReading({ chapters }: Props) {
  const [last, setLast] = useState<ChapterInfo | null>(null)

  useEffect(() => {
    const lr = getLastRead()
    if (!lr) return
    const ch = chapters.find(c => c.id === lr.chapterId)
    if (ch) setLast(ch)
  }, [chapters])

  if (!last) return null

  return (
    <a
      href={`/classics/suwen/${last.id}`}
      className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors px-4 py-3 mb-6"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 shrink-0" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z" />
      </svg>
      <span className="text-sm text-gray-700">
        繼續閱讀：<span className="font-semibold text-amber-900">第{last.number}篇 {last.title}</span>
      </span>
      <span className="ml-auto text-amber-700 text-sm">→</span>
    </a>
  )
}
