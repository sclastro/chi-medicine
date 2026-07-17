// 內建 Web Speech(SpeechSynthesis)粵語朗讀 —— TTS 鏈嘅兜底層。
// 設計重點(承襲自《易經》站 speech.ts):
//  - Chrome 首次 getVoices() 回空,要等 voiceschanged 事件;此處快取一次。
//  - 粵語聲音挑選:優先 yue-* / zh-HK,再按聲音名(Cantonese/粵/廣東/香港)兜底。
import { clampRate, type TtsPrefs } from './prefs'

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  )
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const synth = window.speechSynthesis
    const ready = synth.getVoices()
    if (ready.length) {
      resolve(ready)
      return
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      synth.removeEventListener('voiceschanged', handler)
      resolve(synth.getVoices())
    }
    const handler = () => finish()
    synth.addEventListener('voiceschanged', handler)
    // 安全網:部分瀏覽器唔會觸發事件,1 秒後照樣取一次
    setTimeout(finish, 1000)
  })
}

/** 取得裝置上全部語音(快取一次)。不支援語音時回空陣列。 */
export function getAllVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([])
  if (!voicesPromise) voicesPromise = loadVoices()
  return voicesPromise
}

/** 判斷一個語音是否粵語(yue-* / zh-HK / 名稱含 Cantonese 等)。 */
export function isCantoneseVoice(v: SpeechSynthesisVoice): boolean {
  const lang = v.lang.replace('_', '-').toLowerCase()
  return /^yue\b|^yue-/.test(lang) || lang === 'zh-hk' || /cantonese|粵|廣東|香港/i.test(v.name)
}

function pickCantonese(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find(v => /^yue\b/i.test(v.lang) || /^yue-/i.test(v.lang)) ??
    voices.find(v => v.lang.replace('_', '-').toLowerCase() === 'zh-hk') ??
    voices.find(v => /cantonese|粵|廣東|香港/i.test(v.name)) ??
    null
  )
}

/** 取得全部粵語聲音(供設定 UI 標示用)。 */
export function getCantoneseVoices(): Promise<SpeechSynthesisVoice[]> {
  return getAllVoices().then(vs => vs.filter(isCantoneseVoice))
}

/** 依偏好選語音:有指定且存在則用之,否則退回粵語兜底鏈。 */
async function resolveVoice(prefs: TtsPrefs): Promise<SpeechSynthesisVoice | null> {
  const voices = await getAllVoices()
  if (prefs.voiceURI) {
    const match = voices.find(v => v.voiceURI === prefs.voiceURI)
    if (match) return match
  }
  return pickCantonese(voices)
}

export interface SpeakHooks {
  onstart: () => void
  onend: () => void
  onerror: () => void
}

/** 用內建語音朗讀。stop 由上層 speak.ts 統一協調。 */
export async function speakBuiltin(text: string, prefs: TtsPrefs, hooks: SpeakHooks): Promise<void> {
  if (!isSpeechSupported()) {
    hooks.onerror()
    return
  }
  const synth = window.speechSynthesis
  const utter = new window.SpeechSynthesisUtterance(text)
  utter.lang = 'zh-HK'
  utter.rate = clampRate(prefs.rate)
  const voice = await resolveVoice(prefs)
  if (voice) {
    utter.voice = voice
    utter.lang = voice.lang
  }
  utter.onstart = hooks.onstart
  utter.onend = hooks.onend
  utter.onerror = hooks.onerror
  synth.speak(utter)
}

export function stopBuiltin(): void {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
}
