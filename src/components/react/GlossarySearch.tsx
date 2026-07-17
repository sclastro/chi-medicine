import { useMemo, useState } from 'react'
import type { GlossaryTerm } from '../../types/tcm'

interface Props {
  terms: GlossaryTerm[]
}

/** 術語辭典:即時過濾 + 分類篩選。條目 refs 連去原文出處。 */
export function GlossarySearch({ terms }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const categories = useMemo(
    () => Array.from(new Set(terms.map(t => t.category))),
    [terms],
  )

  const filtered = useMemo(() => {
    const q = query.trim()
    return terms.filter(t => {
      if (category && t.category !== category) return false
      if (!q) return true
      return t.term.includes(q) || t.definition.includes(q)
    })
  }, [terms, query, category])

  if (!terms.length) {
    return (
      <p className="text-gray-400 text-sm">
        辭典內容整理中，將隨經典選讀逐批補充。
      </p>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋術語或釋義，如「肝主疏泄」"
          aria-label="搜尋術語"
          className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:border-amber-400 focus:outline-none"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          aria-label="分類篩選"
          className="text-sm border border-gray-200 rounded-md px-2 py-2 bg-white focus:border-amber-400 focus:outline-none"
        >
          <option value="">全部分類</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {filtered.length ? (
        <ul className="space-y-4">
          {filtered.map(t => (
            <li key={t.term} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="font-semibold text-amber-900">{t.term}</h3>
                <span className="text-xs text-gray-400">{t.category}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{t.definition}</p>
              {t.refs?.length ? (
                <p className="text-xs mt-2 space-x-3">
                  {t.refs.map(r => (
                    <a
                      key={r.chapterId}
                      href={`/classics/${r.bookId}/${r.chapterId}`}
                      className="text-amber-700 hover:underline"
                    >
                      {r.label}
                    </a>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 text-sm">沒有符合的條目。</p>
      )}
    </div>
  )
}
