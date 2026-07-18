import { useEffect, useState } from 'react'
import type { QuizItem } from '../../types/tcm'
import { cardId, clearUnknown, getUnknownMap, markUnknown } from '../../lib/quizprog'

interface Props {
  items: QuizItem[]
  /** 篇章/主題 id;提供先有「識喇/未熟」記錄功能 */
  ownerId?: string
}

/** 自測問答卡:先諗答案,撳卡翻開對照;可標「已掌握/未熟」,未熟卡入進度頁「待重溫」。 */
export function QuizCards({ items, ownerId }: Props) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [unknown, setUnknown] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!ownerId) return
    const map = getUnknownMap()
    const next = new Set<number>()
    items.forEach((_, i) => {
      if (cardId(ownerId, i) in map) next.add(i)
    })
    setUnknown(next)
  }, [ownerId, items])

  if (!items.length) return null

  const toggle = (i: number) => {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const setKnown = (i: number, known: boolean) => {
    if (!ownerId) return
    const id = cardId(ownerId, i)
    if (known) clearUnknown(id)
    else markUnknown(id)
    setUnknown(prev => {
      const next = new Set(prev)
      if (known) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {items.map((q, i) => {
        const isOpen = revealed.has(i)
        const isUnk = unknown.has(i)
        return (
          <div
            key={i}
            className={`rounded-lg border transition-colors ${
              isUnk ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="block w-full text-left p-4"
            >
              <p className="text-sm text-gray-800">
                <span className="text-amber-800 font-semibold mr-2">問</span>
                {q.question}
                {isUnk ? <span className="ml-2 text-[10px] text-amber-700 align-middle">待重溫</span> : null}
              </p>
              {isOpen ? (
                <p className="text-sm text-gray-700 mt-2 pt-2 border-t border-amber-100">
                  <span className="text-amber-800 font-semibold mr-2">答</span>
                  {q.answer}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-2">先自行思考，再點卡對照答案</p>
              )}
            </button>
            {isOpen && ownerId ? (
              <div className="flex gap-2 px-4 pb-3">
                <button
                  type="button"
                  onClick={() => setKnown(i, true)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    !isUnk
                      ? 'bg-amber-800 border-amber-800 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-amber-400'
                  }`}
                >
                  已掌握
                </button>
                <button
                  type="button"
                  onClick={() => setKnown(i, false)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    isUnk
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'border-gray-200 text-gray-600 hover:border-amber-400'
                  }`}
                >
                  未熟，稍後重溫
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
