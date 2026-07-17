// 朗讀總調度(三層鏈):
//   ① Poe 高質朗讀(經 /api/tts 代理) → ② 失敗即標記降級(24h 冷靜期) → ③ 內建 Web Speech 粵語
// 單例協調:同一時間只播一句,以 id 標示當前播放項,各按鈕據此顯示狀態。
import { getTtsPrefs, isPoeDegraded, markPoeDegraded } from './prefs'
import { speakPoe, stopPoe } from './poe'
import { isSpeechSupported, speakBuiltin, stopBuiltin, type SpeakHooks } from './webspeech'

type Listener = (speakingId: string | null) => void

const listeners = new Set<Listener>()
let currentId: string | null = null

function notify() {
  for (const l of listeners) l(currentId)
}

export function subscribe(l: Listener): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function getCurrentId(): string | null {
  return currentId
}

/** 客戶端一定有 fetch(Poe 路徑),所以朗讀功能恆常可用;內建語音只係其中一層。 */
export function isTtsSupported(): boolean {
  return typeof window !== 'undefined'
}

function hooksFor(id: string): SpeakHooks {
  return {
    onstart: () => {
      currentId = id
      notify()
    },
    onend: () => {
      if (currentId === id) currentId = null
      notify()
    },
    onerror: () => {
      if (currentId === id) currentId = null
      notify()
    },
  }
}

/** 以偏好設定朗讀一段文字;id 用於標示當前播放項。 */
export async function speak(id: string, text: string): Promise<void> {
  stop()
  const prefs = getTtsPrefs()
  const hooks = hooksFor(id)

  if (prefs.engine === 'auto' && !isPoeDegraded()) {
    try {
      await speakPoe(text, prefs, hooks)
      return
    } catch {
      // 任何取音頻失敗都入冷靜期:期間直接用內建,唔會每句白等 API
      markPoeDegraded()
    }
  }

  if (isSpeechSupported()) {
    await speakBuiltin(text, prefs, hooks)
  }
}

export function stop(): void {
  stopPoe()
  stopBuiltin()
  currentId = null
  notify()
}
