// 資料存取層:JSON 為內容真相,此處只做型別轉換與查詢。
import type { ClassicBook, ClassicChapter, FoundationTopic, GlossaryTerm } from '../types/tcm'
import suwenData from './suwen.json'
import foundationsData from './foundations.json'
import glossaryData from './glossary.json'

export const books: ClassicBook[] = [suwenData as unknown as ClassicBook].sort(
  (a, b) => a.order - b.order,
)

export const foundations: FoundationTopic[] = (
  foundationsData as unknown as FoundationTopic[]
)
  .slice()
  .sort((a, b) => a.order - b.order)

export const glossary: GlossaryTerm[] = glossaryData as unknown as GlossaryTerm[]

export function getBook(id: string): ClassicBook | undefined {
  return books.find(b => b.id === id)
}

export function getChapter(bookId: string, chapterId: string): ClassicChapter | undefined {
  return getBook(bookId)?.chapters.find(c => c.id === chapterId)
}

/** 已有內容(sections 非空)嘅篇章先可以進入;目錄中其餘標「待補」。 */
export function isChapterReady(chapter: ClassicChapter): boolean {
  return chapter.sections.length > 0
}

export function getTopic(id: string): FoundationTopic | undefined {
  return foundations.find(t => t.id === id)
}

export function isTopicReady(topic: FoundationTopic): boolean {
  return topic.sections.length > 0
}
