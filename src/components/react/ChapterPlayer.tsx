import { useEffect, useRef, useState } from 'react'
import { speakItem, stop } from '../../lib/tts/speak'

interface Props {
  chapterId: string
  /** 段數。原文唔經 props 傳 —— 由 DOM 攞,避免同渲染內容重複序列化(長篇差別以 MB 計)。 */
  count: number
}

/** 由 DOM 讀各段原文(SectionReader 渲染嘅 .section-original,依文件次序即段序)。 */
function readTexts(): string[] {
  return Array.from(document.querySelectorAll('.section-original')).map(el => el.textContent ?? '')
}

type Mode = 'idle' | 'playing' | 'paused'

/**
 * 全篇連續朗讀:逐段自動接續,讀緊嗰段高亮並捲入視野。
 * 支援暫停/續播(記住段序,繼續時由該段開頭讀起);
 * 播放中屏幕底部有浮動控制列,唔使捲返上頂先停到。
 */
export function ChapterPlayer({ chapterId, count }: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [current, setCurrent] = useState(-1)
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const runToken = useRef(0)
  const currentRef = useRef(-1)
  const textsRef = useRef<string[] | null>(null)
  const getTexts = () => (textsRef.current ??= readTexts())

  // 離開頁面時停止
  useEffect(
    () => () => {
      runToken.current++
      stop()
    },
    [],
  )

  // 「由此段朗讀到尾」:接收 SectionReader 靜態掣經事件代理發出嘅指令
  const playRef = useRef<(from: number) => Promise<void>>(async () => {})
  useEffect(() => {
    const onPlayFrom = (e: Event) => {
      const index = (e as CustomEvent<{ index: number }>).detail?.index
      if (Number.isInteger(index) && index >= 0 && index < count) {
        void playRef.current(index)
      }
    }
    document.addEventListener('tcm:play-from', onPlayFrom)
    return () => document.removeEventListener('tcm:play-from', onPlayFrom)
  }, [count])

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

  const reset = () => {
    setMode('idle')
    setCurrent(-1)
    setPausedAt(null)
    currentRef.current = -1
    highlight(null)
  }

  const play = async (from: number) => {
    const token = ++runToken.current
    stop() // 搶佔任何進行中嘅播放(含個別段朗讀)
    setMode('playing')
    setPausedAt(null)
    const texts = getTexts()
    for (let i = from; i < texts.length; i++) {
      if (runToken.current !== token) return
      setCurrent(i)
      currentRef.current = i
      highlight(i)
      const outcome = await speakItem(`${chapterId}-s${i}`, texts[i])
      if (runToken.current !== token) return // 被暫停/停止搶佔:狀態由該動作處理
      if (outcome === 'interrupted') {
        // 外部打斷(如撳咗其他段嘅朗讀掣):當暫停處理,方便返嚟繼續
        setMode('paused')
        setPausedAt(i)
        return
      }
    }
    if (runToken.current === token) reset()
  }
  playRef.current = play

  const pause = () => {
    const at = currentRef.current
    runToken.current++
    stop()
    setPausedAt(at >= 0 ? at : null)
    setMode('paused')
    // 保留高亮做記認,唔清除
  }

  const stopAll = () => {
    runToken.current++
    stop()
    reset()
  }

  if (!count) return null

  const progressText = mode === 'playing'
    ? `第 ${current + 1}／${count} 段`
    : pausedAt != null
      ? `暫停於第 ${pausedAt + 1} 段`
      : ''

  const primaryBtn =
    mode === 'playing' ? (
      <button type="button" onClick={pause} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border bg-amber-800 border-amber-800 text-white hover:bg-amber-700 transition-colors">
        <PauseIcon />
        暫停（{progressText}）
      </button>
    ) : mode === 'paused' ? (
      <span className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void play(pausedAt ?? 0)} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border bg-amber-800 border-amber-800 text-white hover:bg-amber-700 transition-colors">
          <PlayIcon />
          繼續（第 {(pausedAt ?? 0) + 1} 段）
        </button>
        <button type="button" onClick={() => void play(0)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-800 transition-colors">
          <RestartIcon />
          由頭讀起
        </button>
        <button type="button" onClick={stopAll} aria-label="取消" title="取消" className="inline-flex items-center text-sm px-3 py-2 rounded-md border border-gray-300 text-gray-500 hover:border-amber-400 transition-colors">
          <CloseIcon />
        </button>
      </span>
    ) : (
      <button type="button" onClick={() => void play(0)} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:border-amber-400 hover:text-amber-800 transition-colors">
        <PlayIcon />
        朗讀全篇
      </button>
    )

  return (
    <>
      {primaryBtn}

      {/* 浮動控制列:播放/暫停中貼喺屏幕底,跟身操作 */}
      {mode !== 'idle' ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full bg-white border border-gray-200 shadow-lg px-2 py-1.5">
          {mode === 'playing' ? (
            <button type="button" onClick={pause} aria-label="暫停" title="暫停" className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-800 text-white hover:bg-amber-700 transition-colors">
              <PauseIcon />
            </button>
          ) : (
            <button type="button" onClick={() => void play(pausedAt ?? 0)} aria-label="繼續" title="繼續" className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-800 text-white hover:bg-amber-700 transition-colors">
              <PlayIcon />
            </button>
          )}
          <span className="text-xs text-gray-600 px-1.5 whitespace-nowrap">{progressText}</span>
          <button type="button" onClick={stopAll} aria-label="停止並收起" title="停止並收起" className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-amber-800 hover:bg-amber-50 transition-colors">
            <CloseIcon />
          </button>
        </div>
      ) : null}
    </>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4.5v15l13-7.5z" /></svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
  )
}

function RestartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
  )
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
  )
}
