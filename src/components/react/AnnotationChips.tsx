import type { Annotation } from '../../types/tcm'
import { speak } from '../../lib/tts/speak'

interface Props {
  annotations: Annotation[]
  /** 朗讀 id 前綴(如 suwen-01-s3) */
  idPrefix: string
}

/** 難字註:字(可點讀單字粵音)+粵拼+字義。 */
export function AnnotationChips({ annotations, idPrefix }: Props) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
      {annotations.map((a, j) => (
        <span key={j} className="inline-flex items-baseline gap-1">
          <button
            type="button"
            onClick={() => void speak(`${idPrefix}-a${j}`, a.char)}
            title={`朗讀「${a.char}」`}
            aria-label={`朗讀「${a.char}」`}
            className="text-amber-800 font-semibold text-sm hover:bg-amber-100 rounded px-0.5 -mx-0.5 border-b border-dotted border-amber-300"
          >
            {a.char}
          </button>
          <span className="text-gray-400">{a.jyutping}</span>
          <span>{a.meaning}</span>
        </span>
      ))}
    </div>
  )
}
