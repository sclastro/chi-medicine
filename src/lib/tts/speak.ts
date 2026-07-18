// 朗讀總調度(三層鏈):
//   ① Poe 高質朗讀(經 /api/tts 代理) → ② 失敗即標記降級(24h 冷靜期) → ③ 內建 Web Speech 粵語
// 單例協調:同一時間只播一句,以 id 標示當前播放項,各按鈕據此顯示狀態。
// speakItem() 回傳「播放完成/被打斷」,供連續朗讀(ChapterPlayer)逐段接續。
import { getTtsPrefs, isPoeDegraded, markPoeDegraded } from './prefs'
import { speakPoe, stopPoe } from './poe'
import { isSpeechSupported, speakBuiltin, stopBuiltin, type SpeakHooks } from './webspeech'

type Listener = (speakingId: string | null) => void

export type SpeakOutcome = 'ended' | 'interrupted'

const listeners = new Set<Listener>()
let currentId: string | null = null
let currentDone: ((outcome: SpeakOutcome) => void) | null = null

function notify() {
  for (const l of listeners) l(currentId)
}

/** 完成回調只觸發一次:自然播完 = ended;stop()/被新播放搶佔 = interrupted。 */
function finish(outcome: SpeakOutcome) {
  const done = currentDone
  currentDone = null
  if (done) done(outcome)
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
      finish('ended')
    },
    onerror: () => {
      if (currentId === id) currentId = null
      notify()
      finish('ended') // 播放中途出錯視作完結,連續朗讀繼續下一段
    },
  }
}

/**
 * 朗讀一段文字,回傳一個喺「播完或被打斷」時 resolve 嘅 promise。
 * 連續朗讀用 outcome 判斷:interrupted = 用戶叫停,應中止序列。
 */
export async function speakItem(id: string, text: string): Promise<SpeakOutcome> {
  stop()
  const prefs = getTtsPrefs()
  const hooks = hooksFor(id)
  const done = new Promise<SpeakOutcome>(resolve => {
    currentDone = resolve
  })

  let started = false
  if (prefs.engine === 'auto' && !isPoeDegraded()) {
    try {
      await speakPoe(text, prefs, hooks)
      started = true
    } catch {
      // 任何取音頻失敗都入冷靜期:期間直接用內建,唔會每句白等 API
      markPoeDegraded()
    }
  }

  if (!started) {
    if (isSpeechSupported()) {
      await speakBuiltin(text, prefs, hooks)
    } else {
      finish('ended') // 兩層都不可用:即時完結,避免序列卡死
    }
  }

  return done
}

/** 以偏好設定朗讀一段文字;id 用於標示當前播放項。 */
export function speak(id: string, text: string): Promise<SpeakOutcome> {
  return speakItem(id, text)
}

export function stop(): void {
  stopPoe()
  stopBuiltin()
  currentId = null
  notify()
  finish('interrupted')
}
