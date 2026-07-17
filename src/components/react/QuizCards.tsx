import { useState } from 'react'
import type { QuizItem } from '../../types/tcm'

interface Props {
  items: QuizItem[]
}

/** 自測問答卡:先諗答案,撳卡翻開對照(主動回憶,唔係淨係睇)。 */
export function QuizCards({ items }: Props) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  if (!items.length) return null

  const toggle = (i: number) => {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {items.map((q, i) => {
        const isOpen = revealed.has(i)
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            aria-expanded={isOpen}
            className="block w-full text-left rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors p-4"
          >
            <p className="text-sm text-gray-800">
              <span className="text-amber-800 font-semibold mr-2">問</span>
              {q.question}
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
        )
      })}
    </div>
  )
}
