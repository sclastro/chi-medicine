// Poe API 朗讀代理:key 只存 Vercel 環境變數(POE_API_KEY),永不落前端。
// Poe 用 OpenAI 相容 chat completions;TTS model 回覆內容附音頻 URL,此處取回並串流返俾客戶端。
// 未設 key → 503;上游拒絕(key 過期/quota 爆) → 502。客戶端見 5xx 即降級用內建語音。
import type { APIRoute } from 'astro'

export const prerender = false

const MAX_CHARS = 800
const POE_URL = 'https://api.poe.com/v1/chat/completions'
const AUDIO_URL_RE = /https:\/\/[^\s)\]"'<>]+/g

function jsonError(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function env(name: string): string | undefined {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name]
  if (fromMeta) return fromMeta
  return typeof process !== 'undefined' ? process.env[name] : undefined
}

function pickAudioUrl(content: string): string | null {
  const urls = content.match(AUDIO_URL_RE) ?? []
  return (
    urls.find(u => /\.(mp3|wav|m4a|ogg|aac|flac)(\?|$)/i.test(u)) ??
    urls.find(u => /poecdn\.net/i.test(u)) ??
    urls[0] ??
    null
  )
}

export const POST: APIRoute = async ({ request }) => {
  const key = env('POE_API_KEY')
  if (!key) return jsonError(503, 'tts-unconfigured')

  let text = ''
  try {
    const body = (await request.json()) as { text?: unknown }
    if (typeof body.text === 'string') text = body.text.trim()
  } catch {
    // 落到下面統一 400
  }
  if (!text) return jsonError(400, 'empty-text')
  if (text.length > MAX_CHARS) return jsonError(400, 'text-too-long')

  const model = env('POE_TTS_MODEL') ?? 'elevenlabs-v3'
  // 可選前綴(如指定粵語聲音嘅指示),經 env 調校,唔使改 code 重新部署
  const prefix = env('POE_TTS_PROMPT_PREFIX') ?? ''

  let upstream: Response
  try {
    upstream = await fetch(POE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prefix ? `${prefix}${text}` : text }],
        stream: false,
      }),
    })
  } catch {
    return jsonError(502, 'poe-unreachable')
  }
  if (!upstream.ok) return jsonError(502, 'poe-rejected')

  let content = ''
  try {
    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    content = data.choices?.[0]?.message?.content ?? ''
  } catch {
    return jsonError(502, 'poe-bad-response')
  }

  const audioUrl = pickAudioUrl(content)
  if (!audioUrl) return jsonError(502, 'no-audio-in-response')

  let audio: Response
  try {
    audio = await fetch(audioUrl)
  } catch {
    return jsonError(502, 'audio-unreachable')
  }
  if (!audio.ok || !audio.body) return jsonError(502, 'audio-fetch-failed')

  return new Response(audio.body, {
    headers: {
      'Content-Type': audio.headers.get('content-type') ?? 'audio/mpeg',
      'Cache-Control': 'no-store', // 客戶端有 IndexedDB 快取;呢度唔使 CDN 快取住私有音頻
    },
  })
}
