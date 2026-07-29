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

  // 未搜尋、未揀分類先分組;一篩選就攤平(分組反而阻住睇結果)
  const grouped = !query.trim() && !category

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

      <p className="text-xs text-gray-400 mb-3">
        {query.trim() || category ? `${filtered.length} 條符合` : `共 ${terms.length} 條，分 ${categories.length} 類`}
      </p>

      {filtered.length ? (
        grouped ? (
          // 未篩選時按分類分組,114 條先至揾得到路
          <div className="space-y-8">
            {categories.map(cat => {
              const items = filtered.filter(t => t.category === cat)
              if (!items.length) return null
              return (
                <section key={cat}>
                  <h2 className="text-sm font-semibold text-amber-900 border-b border-amber-100 pb-1.5 mb-3">
                    {cat}
                    <span className="text-xs font-normal text-gray-400 ml-2">{items.length}</span>
                  </h2>
                  <ul className="space-y-4">{items.map(renderTerm)}</ul>
                </section>
              )
            })}
          </div>
        ) : (
          <ul className="space-y-4">{filtered.map(renderTerm)}</ul>
        )
      ) : (
        <p className="text-gray-400 text-sm">沒有符合的條目。</p>
      )}
    </div>
  )
}

function renderTerm(t: GlossaryTerm) {
  return (
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
  )
}
