// 高質朗讀層:經 /api/tts(Vercel function 代理 Poe API)取音頻,IndexedDB 快取。
// 古文係靜態內容,同一段文字只叫一次 API —— 快取以 sha-256(text) 為 key。
import { clampRate, type TtsPrefs } from './prefs'
import type { SpeakHooks } from './webspeech'

const DB_NAME = 'tcm-tts-cache'
const STORE = 'audio'
const FETCH_TIMEOUT_MS = 25_000

let currentAudio: HTMLAudioElement | null = null
let currentUrl: string | null = null

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null)
        return
      }
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function cacheGet(key: string): Promise<Blob | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function cachePut(key: string, blob: Blob): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

async function cacheKey(text: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return `raw:${text}` // 無 crypto.subtle(非 https)時退化為原文 key
  }
}

/** 標示「呢類失敗應該觸發降級」(key 未設/過期/quota 爆);網絡閃斷唔算。 */
export class PoeUnavailableError extends Error {}

async function fetchAudio(text: string): Promise<Blob> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
    if (!res.ok) {
      // 5xx/503(未設 key)/502(上游拒絕,含 key 過期) → 降級;其餘照拋一般錯誤
      if (res.status >= 500) throw new PoeUnavailableError(`tts ${res.status}`)
      throw new Error(`tts ${res.status}`)
    }
    return await res.blob()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 高質朗讀:cache 先行,miss 則經代理取音頻。
 * 取唔到音頻會 throw(俾上層決定降級);播放一旦開始,錯誤只透過 hooks 通知。
 */
export async function speakPoe(text: string, prefs: TtsPrefs, hooks: SpeakHooks): Promise<void> {
  const key = await cacheKey(text)
  let blob = await cacheGet(key)
  if (!blob) {
    blob = await fetchAudio(text)
    void cachePut(key, blob)
  }
  stopPoe()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.playbackRate = clampRate(prefs.rate)
  currentAudio = audio
  currentUrl = url
  audio.onended = () => {
    cleanup(audio)
    hooks.onend()
  }
  audio.onerror = () => {
    cleanup(audio)
    hooks.onerror()
  }
  try {
    await audio.play()
    hooks.onstart()
  } catch (e) {
    cleanup(audio)
    throw e // autoplay 被擋等情況:俾上層退內建
  }
}

function cleanup(audio: HTMLAudioElement) {
  if (currentAudio === audio) {
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    currentAudio = null
    currentUrl = null
  }
}

export function stopPoe(): void {
  if (currentAudio) {
    const a = currentAudio
    a.onended = null
    a.onerror = null
    a.pause()
    cleanup(a)
  }
}
