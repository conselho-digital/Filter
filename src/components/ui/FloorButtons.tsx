import { ChevronDown, ChevronUp } from 'lucide-react'
import { floorStep } from '../../lib/floorStep'
import { useStore } from '../../store/useStore'

const btn =
  'glass pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white'

/** Botões para subir e descer a câmera um andar (o mesmo que três dedos ou Page Up/Down). */
export function FloorButtons() {
  const viewMode = useStore((s) => s.viewMode)
  const hasUnit = useStore((s) => s.selectedUnitId !== null)
  const section = useStore((s) => s.section)
  if (section || (viewMode !== 'aerial' && viewMode !== 'tower' && viewMode !== 'unit')) return null
  return (
    <div
      role="group"
      aria-label="Subir ou descer a câmera"
      className={`absolute top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 right-4 max-md:right-3 max-md:top-[38%] ${hasUnit ? 'md:right-[776px]' : ''}`}
    >
      <button type="button" aria-label="Subir um andar" className={btn} onClick={() => floorStep.fn?.(1)}>
        <ChevronUp size={24} aria-hidden />
      </button>
      <button type="button" aria-label="Descer um andar" className={btn} onClick={() => floorStep.fn?.(-1)}>
        <ChevronDown size={24} aria-hidden />
      </button>
    </div>
  )
}
