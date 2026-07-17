import { useEffect, useState } from 'react'
import { getCurrentId, isTtsSupported, speak, stop, subscribe } from '../../lib/tts/speak'

interface Props {
  /** 唯一識別,用於判斷此句是否正在朗讀 */
  id: string
  /** 要朗讀嘅文字(文言原文) */
  text: string
  ariaLabel?: string
}

/** 粵語朗讀按鈕:撳一下讀出,讀緊時再撳即停。高質朗讀優先,自動退內建語音。 */
export function SpeakButton({ id, text, ariaLabel }: Props) {
  const [supported] = useState(isTtsSupported)
  const [speakingId, setSpeakingId] = useState<string | null>(() => getCurrentId())
  const [loading, setLoading] = useState(false)

  useEffect(() => subscribe(setSpeakingId), [])

  if (!supported) return null

  const active = speakingId === id

  const onClick = async () => {
    if (active) {
      stop()
      return
    }
    setLoading(true)
    try {
      await speak(id, text)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? '停止朗讀' : (ariaLabel ?? '粵語朗讀')}
      aria-pressed={active}
      title={active ? '停止' : '粵語朗讀'}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors ${
        active ? 'bg-amber-700 text-white' : 'text-amber-700 hover:bg-amber-100'
      } ${loading && !active ? 'opacity-50' : ''}`}
    >
      <SpeakerIcon animate={active} />
    </button>
  )
}

function SpeakerIcon({ animate }: { animate: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" className={animate ? 'speak-wave' : ''} />
      <path d="M18.5 6a9 9 0 0 1 0 12" className={animate ? 'speak-wave speak-wave-2' : ''} />
    </svg>
  )
}
