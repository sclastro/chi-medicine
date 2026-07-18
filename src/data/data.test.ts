// 資料完整性測試:結構、唯一性、內部連結有效性、粵拼格式。
import { describe, expect, it } from 'vitest'
import { books, foundations, getChapter, glossary } from './index'
import quotes from './quotes.json'
import type { ClassicRef } from '../types/tcm'

const JYUTPING = /^[a-z]+[1-6]( [a-z]+[1-6])*$/

function expectValidRefs(refs: ClassicRef[] | undefined, where: string) {
  for (const ref of refs ?? []) {
    expect(getChapter(ref.bookId, ref.chapterId), `${where} 的 ref 指向不存在篇章`).toBeDefined()
    expect(ref.label.length, `${where} 的 ref label 為空`).toBeGreaterThan(0)
  }
}

describe('素問(suwen)', () => {
  const suwen = books.find(b => b.id === 'suwen')!

  it('存在且有 81 篇', () => {
    expect(suwen).toBeDefined()
    expect(suwen.chapters).toHaveLength(81)
  })

  it('篇次 1–81 連續、id 對應篇次且唯一', () => {
    suwen.chapters.forEach((c, i) => {
      expect(c.number).toBe(i + 1)
      expect(c.id).toBe(`suwen-${String(i + 1).padStart(2, '0')}`)
      expect(c.title.length).toBeGreaterThan(0)
    })
    expect(new Set(suwen.chapters.map(c => c.id)).size).toBe(81)
  })

  it('已補內容嘅篇:每段原文非空;quiz 問答齊全', () => {
    for (const c of suwen.chapters) {
      for (const s of c.sections) {
        expect(s.original.length, `${c.id} 有空原文段`).toBeGreaterThan(0)
      }
      for (const q of c.quiz ?? []) {
        expect(q.question.length).toBeGreaterThan(0)
        expect(q.answer.length).toBeGreaterThan(0)
      }
    }
  })

  it('難字註:粵拼格式正確、字非空', () => {
    for (const c of suwen.chapters) {
      for (const s of c.sections) {
        for (const a of s.annotations ?? []) {
          expect(a.char.length, `${c.id} 有空難字`).toBeGreaterThan(0)
          expect(a.jyutping, `${c.id}「${a.char}」粵拼格式錯:${a.jyutping}`).toMatch(JYUTPING)
          expect(a.meaning.length, `${c.id}「${a.char}」冇字義`).toBeGreaterThan(0)
          expect(s.original.includes(a.char), `${c.id} 難字「${a.char}」不在該段原文`).toBe(true)
        }
      }
    }
  })
})

describe('基礎理論(foundations)', () => {
  it('8 篇、order 1–8、id 唯一、必要欄位非空', () => {
    expect(foundations).toHaveLength(8)
    foundations.forEach((t, i) => {
      expect(t.order).toBe(i + 1)
      expect(t.id.length).toBeGreaterThan(0)
      expect(t.title.length).toBeGreaterThan(0)
      expect(t.intro.length).toBeGreaterThan(0)
      expect(t.courseRef.length).toBeGreaterThan(0)
    })
    expect(new Set(foundations.map(t => t.id)).size).toBe(8)
  })

  it('sections/quiz/refs 結構有效', () => {
    for (const t of foundations) {
      for (const s of t.sections) {
        expect(s.heading.length, `${t.id} 有空 heading`).toBeGreaterThan(0)
        expect(s.body.length, `${t.id}「${s.heading}」body 為空`).toBeGreaterThan(0)
        expectValidRefs(s.refs, `${t.id}/${s.heading}`)
      }
      for (const q of t.quiz ?? []) {
        expect(q.question.length).toBeGreaterThan(0)
        expect(q.answer.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('金句(quotes)', () => {
  it('每句屬有效已收錄篇章、逐字係原文子串、無重複', () => {
    const seen = new Set<string>()
    for (const q of quotes as { chapterId: string; text: string }[]) {
      const ch = getChapter('suwen', q.chapterId)
      expect(ch, `金句篇章 ${q.chapterId} 不存在`).toBeDefined()
      expect(ch!.sections.length, `金句篇章 ${q.chapterId} 未收錄`).toBeGreaterThan(0)
      const full = ch!.sections.map(s => s.original).join('')
      expect(full.includes(q.text), `金句不在 ${q.chapterId} 原文:「${q.text.slice(0, 15)}…」`).toBe(true)
      const key = `${q.chapterId}|${q.text}`
      expect(seen.has(key), `金句重複:${key.slice(0, 30)}`).toBe(false)
      seen.add(key)
    }
  })
})

describe('辭典(glossary)', () => {
  it('條目唯一、欄位非空、refs 有效', () => {
    expect(new Set(glossary.map(g => g.term)).size).toBe(glossary.length)
    for (const g of glossary) {
      expect(g.term.length).toBeGreaterThan(0)
      expect(g.category.length).toBeGreaterThan(0)
      expect(g.definition.length).toBeGreaterThan(0)
      expectValidRefs(g.refs, `辭典「${g.term}」`)
    }
  })
})
