import { useEffect, useRef, useState } from 'react'
import { speakItem, stop } from '../../lib/tts/speak'

interface Props {
  chapterId: string
  /** 各段原文(依段序) */
  texts: string[]
}

/** 全篇連續朗讀:逐段自動接續,讀緊嗰段高亮並捲入視野;再撳即停。 */
export function ChapterPlayer({ chapterId, texts }: Props) {
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(-1)
  const runToken = useRef(0)

  // 離開頁面時停止
  useEffect(() => () => stop(), [])

  const highlight = (idx: number | null) => {
    document.querySelectorAll('.reading-now').forEach(el => el.classList.remove('reading-now'))
    if (idx != null) {
      const el = document.getElementById(`s${idx}`)
      if (el) {
        el.classList.add('reading-now')
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const play = async (from = 0) => {
    const token = ++runToken.current
    setPlaying(true)
    for (let i = from; i < texts.length; i++) {
      if (runToken.current !== token) return
      setCurrent(i)
      highlight(i)
      const outcome = await speakItem(`${chapterId}-s${i}`, texts[i])
      if (outcome === 'interrupted' || runToken.current !== token) {
        if (runToken.current === token) {
          setPlaying(false)
          setCurrent(-1)
          highlight(null)
        }
        return
      }
    }
    if (runToken.current === token) {
      setPlaying(false)
      setCurrent(-1)
      highlight(null)
    }
  }

  const onClick = () => {
    if (playing) {
      runToken.current++
      stop()
      setPlaying(false)
      setCurrent(-1)
      highlight(null)
    } else {
      void play(0)
    }
  }

  if (!texts.length) return null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={playing}
      className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border transition-colors ${
        playing
          ? 'bg-amber-800 border-amber-800 text-white hover:bg-amber-700'
          : 'border-gray-300 text-gray-700 hover:border-amber-400 hover:text-amber-800'
      }`}
    >
      {playing ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
          停止（第 {current + 1}／{texts.length} 段）
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4.5v15l13-7.5z" /></svg>
          朗讀全篇
        </>
      )}
    </button>
  )
}
