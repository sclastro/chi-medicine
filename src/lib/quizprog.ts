// 問答卡「未熟」記錄:localStorage tcm.quiz.v1 = { [cardId]: ISO }。
// cardId = `${ownerId}:${index}`(ownerId 為篇章/主題 id);「識喇」即刪除,只儲未熟。

const KEY = 'tcm.quiz.v1'

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function getUnknownMap(): Record<string, string> {
  const s = storage()
  if (!s) return {}
  try {
    const raw = s.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function save(map: Record<string, string>): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(KEY, JSON.stringify(map))
  } catch {
    // 靜默失敗
  }
}

export function cardId(ownerId: string, index: number): string {
  return `${ownerId}:${index}`
}

export function isUnknown(id: string): boolean {
  return id in getUnknownMap()
}

export function markUnknown(id: string): void {
  const map = getUnknownMap()
  map[id] = new Date().toISOString()
  save(map)
}

export function clearUnknown(id: string): void {
  const map = getUnknownMap()
  delete map[id]
  save(map)
}
