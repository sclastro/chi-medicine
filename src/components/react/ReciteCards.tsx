import { useState } from 'react'
import { speak } from '../../lib/tts/speak'
import { getCurrentId, isTtsSupported, stop, subscribe } from '../../lib/tts/speak'
import { useEffect } from 'react'

export interface ReciteItem {
  chapterId: string
  number: number
  title: string
  text: string
}

interface Props {
  items: ReciteItem[]
}

/** 金句背誦卡:預設遮蔽,先憑出處與提示默背,撳卡對照原文;可逐句朗讀。 */
export function ReciteCards({ items }: Props) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [speakingId, setSpeakingId] = useState<string | null>(() => getCurrentId())

  useEffect(() => subscribe(setSpeakingId), [])

  const toggle = (i: number) => {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const allOpen = revealed.size === items.length

  // 依篇分組(items 已按篇次排序)
  const groups: { number: number; title: string; chapterId: string; entries: { item: ReciteItem; idx: number }[] }[] = []
  items.forEach((item, idx) => {
    const last = groups[groups.length - 1]
    if (last && last.chapterId === item.chapterId) {
      last.entries.push({ item, idx })
    } else {
      groups.push({ number: item.number, title: item.title, chapterId: item.chapterId, entries: [{ item, idx }] })
    }
  })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setRevealed(allOpen ? new Set() : new Set(items.map((_, i) => i)))}
          className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-800 transition-colors"
        >
          {allOpen ? '全部遮蔽' : '全部顯示'}
        </button>
      </div>

      <div className="space-y-8">
        {groups.map(g => (
          <section key={g.chapterId}>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">
              <a href={`/classics/suwen/${g.chapterId}`} className="hover:text-amber-800 hover:underline">
                第{g.number}篇 {g.title}
              </a>
            </h2>
            <div className="space-y-3">
              {g.entries.map(({ item, idx }) => {
                const isOpen = revealed.has(idx)
                const sid = `recite-${idx}`
                const active = speakingId === sid
                return (
                  <div key={idx} className="rounded-lg border border-gray-200 hover:border-amber-300 transition-colors">
                    <button
                      type="button"
                      onClick={() => toggle(idx)}
                      aria-expanded={isOpen}
                      className="block w-full text-left px-4 py-3"
                    >
                      {isOpen ? (
                        <p className="text-lg leading-relaxed text-gray-900">{item.text}</p>
                      ) : (
                        <p className="text-lg leading-relaxed text-gray-400">
                          {item.text.slice(0, 4)}
                          <span className="tracking-widest">⋯⋯</span>
                          <span className="text-xs ml-2">（默背後點卡對照）</span>
                        </p>
                      )}
                    </button>
                    {isOpen && isTtsSupported() ? (
                      <div className="px-4 pb-3">
                        <button
                          type="button"
                          onClick={() => (active ? stop() : void speak(sid, item.text))}
                          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                            active
                              ? 'bg-amber-800 border-amber-800 text-white'
                              : 'border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-800'
                          }`}
                        >
                          {active ? '停止' : '朗讀'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
