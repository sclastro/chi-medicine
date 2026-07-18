import { useEffect, useRef, useState } from 'react'
import {
  RATE_MAX,
  RATE_MIN,
  clearPoeDegraded,
  getTtsPrefs,
  isPoeDegraded,
  setTtsPrefs,
  type TtsEngine,
} from '../../lib/tts/prefs'
import { getAllVoices, isCantoneseVoice, isSpeechSupported } from '../../lib/tts/webspeech'
import { speak, stop } from '../../lib/tts/speak'
import { getReaderPrefs, setReaderPrefs, type FontScale } from '../../lib/reader'

const SAMPLE = '陰陽者，天地之道也，萬物之綱紀。'
const FONT_LABELS: { value: FontScale; label: string }[] = [
  { value: 's', label: '細' },
  { value: 'm', label: '標準' },
  { value: 'l', label: '大' },
]

/** 朗讀設定:引擎(高質/內建) + 內建語音選擇 + 語速,存 localStorage(tcm.tts.v1)。header 齒輪開合。 */
export function TtsSettings() {
  const [open, setOpen] = useState(false)
  const [engine, setEngine] = useState<TtsEngine>('auto')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState<string | null>(null)
  const [rate, setRate] = useState(0.9)
  const [degraded, setDegraded] = useState(false)
  const [fontScale, setFontScale] = useState<FontScale>('m')
  const [hideBaihua, setHideBaihua] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 開啟時載入語音與現有偏好
  useEffect(() => {
    if (!open) return
    const prefs = getTtsPrefs()
    setEngine(prefs.engine)
    setVoiceURI(prefs.voiceURI)
    setRate(prefs.rate)
    setDegraded(isPoeDegraded())
    const rp = getReaderPrefs()
    setFontScale(rp.fontScale)
    setHideBaihua(rp.hideBaihua)
    let alive = true
    getAllVoices().then(vs => {
      if (alive) setVoices(vs)
    })
    return () => {
      alive = false
    }
  }, [open])

  // 點擊面板外 / 按 Esc 即關
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const persist = (next: { engine?: TtsEngine; voiceURI?: string | null; rate?: number }) => {
    setTtsPrefs({
      engine: next.engine ?? engine,
      voiceURI: next.voiceURI === undefined ? voiceURI : next.voiceURI,
      rate: next.rate ?? rate,
    })
  }

  const onEngineChange = (value: TtsEngine) => {
    setEngine(value)
    persist({ engine: value })
  }

  const onVoiceChange = (value: string) => {
    const v = value === '' ? null : value
    setVoiceURI(v)
    persist({ voiceURI: v })
  }

  const onRateChange = (value: number) => {
    setRate(value)
    persist({ rate: value })
  }

  const onRetryPoe = () => {
    clearPoeDegraded()
    setDegraded(false)
  }

  const speechOk = isSpeechSupported()
  const hasCantonese = voices.some(isCantoneseVoice)
  const cantonese = voices.filter(isCantoneseVoice)
  const others = voices.filter(v => !isCantoneseVoice(v))

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="朗讀設定"
        aria-expanded={open}
        title="朗讀設定"
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
          open ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:bg-amber-50 hover:text-amber-800'
        }`}
      >
        <GearIcon />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="朗讀設定"
          className="absolute right-0 mt-2 w-72 p-4 bg-white rounded-lg border border-gray-200 shadow-lg z-20"
        >
          <h3 className="text-sm font-semibold text-amber-900 mb-3">顯示</h3>

          <label className="block text-xs text-gray-500 mb-1">字級</label>
          <div className="flex rounded-md border border-gray-200 overflow-hidden mb-3">
            {FONT_LABELS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setFontScale(f.value)
                  setReaderPrefs({ fontScale: f.value, hideBaihua })
                }}
                aria-pressed={fontScale === f.value}
                className={`flex-1 text-sm py-1.5 transition-colors ${
                  fontScale === f.value
                    ? 'bg-amber-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-amber-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
            <input
              type="checkbox"
              checked={hideBaihua}
              onChange={e => {
                setHideBaihua(e.target.checked)
                setReaderPrefs({ fontScale, hideBaihua: e.target.checked })
              }}
              className="accent-amber-700 w-4 h-4"
            />
            原文自測模式（暫時隱藏白話）
          </label>

          <h3 className="text-sm font-semibold text-amber-900 mb-3 pt-3 border-t border-gray-100">朗讀設定</h3>

          <label className="block text-xs text-gray-500 mb-1" htmlFor="tts-engine">朗讀引擎</label>
          <select
            id="tts-engine"
            value={engine}
            onChange={e => onEngineChange(e.target.value as TtsEngine)}
            className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 mb-1 bg-white focus:border-amber-400 focus:outline-none"
          >
            <option value="auto">自動（高質朗讀優先）</option>
            <option value="builtin">僅用裝置內建語音</option>
          </select>

          {engine === 'auto' && degraded ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1.5 mb-2 leading-relaxed">
              高質朗讀暫時不可用，已改用裝置內建語音。
              <button type="button" onClick={onRetryPoe} className="underline ml-1">重試</button>
            </p>
          ) : (
            <div className="mb-2" />
          )}

          <label className="block text-xs text-gray-500 mb-1" htmlFor="tts-voice">內建語音（後備）</label>
          <select
            id="tts-voice"
            value={voiceURI ?? ''}
            onChange={e => onVoiceChange(e.target.value)}
            disabled={!speechOk}
            className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 mb-1 bg-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
          >
            <option value="">自動挑選粵語</option>
            {cantonese.length ? (
              <optgroup label="粵語">
                {cantonese.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                ))}
              </optgroup>
            ) : null}
            {others.length ? (
              <optgroup label="其他語音">
                {others.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}（{v.lang}）</option>
                ))}
              </optgroup>
            ) : null}
          </select>

          {speechOk && !hasCantonese ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1.5 mb-3 leading-relaxed">
              本裝置未偵測到粵語語音。可於系統語音設定加裝「中文（香港）／粵語」語音包，後備朗讀效果會更佳。
            </p>
          ) : (
            <div className="mb-3" />
          )}

          <label className="block text-xs text-gray-500 mb-1" htmlFor="tts-rate">
            語速 <span className="text-gray-400">{rate.toFixed(1)}×</span>
          </label>
          <input
            id="tts-rate"
            type="range"
            min={RATE_MIN}
            max={RATE_MAX}
            step={0.1}
            value={rate}
            onChange={e => onRateChange(Number(e.target.value))}
            className="w-full accent-amber-700 mb-3"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => speak('tts-preview', SAMPLE)}
              className="flex-1 text-sm px-3 py-1.5 bg-amber-800 text-white rounded-md hover:bg-amber-700 transition-colors"
            >
              試聽
            </button>
            <button
              type="button"
              onClick={() => stop()}
              className="text-sm px-3 py-1.5 border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            >
              停止
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
