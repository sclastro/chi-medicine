// 朗讀偏好(引擎/語音/語速)存 localStorage tcm.tts.v1;
// Poe 降級狀態存 tcm.tts.degraded.v1(冷靜期後自動重試一次)。

export type TtsEngine = 'auto' | 'builtin'

export interface TtsPrefs {
  engine: TtsEngine       // auto = 高質朗讀(Poe)優先,失敗退內建;builtin = 只用裝置內建
  voiceURI: string | null // 內建語音選擇;null = 自動挑選粵語
  rate: number            // 0.5–1.5;文言預設稍慢
}

const PREFS_KEY = 'tcm.tts.v1'
const DEGRADED_KEY = 'tcm.tts.degraded.v1'
const DEFAULT_PREFS: TtsPrefs = { engine: 'auto', voiceURI: null, rate: 0.9 }
export const RATE_MIN = 0.5
export const RATE_MAX = 1.5
const DEGRADE_HOURS = 24

export function clampRate(r: number): number {
  if (!Number.isFinite(r)) return DEFAULT_PREFS.rate
  return Math.min(RATE_MAX, Math.max(RATE_MIN, r))
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function getTtsPrefs(): TtsPrefs {
  const s = storage()
  if (!s) return { ...DEFAULT_PREFS }
  try {
    const raw = s.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<TtsPrefs>
    return {
      engine: parsed.engine === 'builtin' ? 'builtin' : 'auto',
      voiceURI: typeof parsed.voiceURI === 'string' ? parsed.voiceURI : null,
      rate: clampRate(typeof parsed.rate === 'number' ? parsed.rate : DEFAULT_PREFS.rate),
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function setTtsPrefs(prefs: TtsPrefs): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(
      PREFS_KEY,
      JSON.stringify({
        engine: prefs.engine,
        voiceURI: prefs.voiceURI,
        rate: clampRate(prefs.rate),
      }),
    )
  } catch {
    // 配額爆滿或私隱模式:靜默失敗
  }
}

/** Poe 高質朗讀是否處於降級狀態(冷靜期未過)。 */
export function isPoeDegraded(): boolean {
  const s = storage()
  if (!s) return false
  try {
    const raw = s.getItem(DEGRADED_KEY)
    if (!raw) return false
    const { until } = JSON.parse(raw) as { until?: number }
    if (typeof until !== 'number') return false
    if (Date.now() >= until) {
      s.removeItem(DEGRADED_KEY) // 冷靜期已過:清除,俾下一次重試
      return false
    }
    return true
  } catch {
    return false
  }
}

/** 標記 Poe 朗讀失敗:進入冷靜期,期間直接用內建語音,唔會每句都白等 API。 */
export function markPoeDegraded(hours: number = DEGRADE_HOURS): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(DEGRADED_KEY, JSON.stringify({ until: Date.now() + hours * 3600_000 }))
  } catch {
    // 靜默失敗
  }
}

/** 手動重試:清除降級狀態(設定面板「重試高質朗讀」用)。 */
export function clearPoeDegraded(): void {
  const s = storage()
  if (!s) return
  try {
    s.removeItem(DEGRADED_KEY)
  } catch {
    // 靜默失敗
  }
}
