import { useEffect, useState } from 'react'
import { ArrowLeft, Hand } from 'lucide-react'
import { useStore, type WindowViewPreset } from '../../store/useStore'

const PRESETS: { id: WindowViewPreset; label: string }[] = [
  { id: 'view1', label: 'Vista 1' },
  { id: 'view2', label: 'Vista 2' },
]

/** Barra inferior da vista da varanda: trocar de ângulo e voltar ao apartamento. */
export function WindowViewBar() {
  const viewMode = useStore((s) => s.viewMode)
  const preset = useStore((s) => s.windowViewPreset)
  const setPreset = useStore((s) => s.setWindowViewPreset)
  const closeWindowView = useStore((s) => s.closeWindowView)
  const [hintDone, setHintDone] = useState(false)
  const open = viewMode === 'windowView'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWindowView()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeWindowView])

  // a dica de arrastar some no primeiro gesto ou depois de alguns segundos
  useEffect(() => {
    if (!open || hintDone) return
    const hide = () => setHintDone(true)
    const timer = window.setTimeout(hide, 6000)
    window.addEventListener('pointermove', hide, { once: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', hide)
    }
  }, [open, hintDone])

  if (!open) return null

  return (
    <>
      {!hintDone && (
        <div
          role="status"
          className="glass pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-2xl px-5 py-3 text-sm text-white"
        >
          <Hand size={22} aria-hidden />
          Arraste para olhar ao redor
        </div>
      )}
      <nav
        aria-label="Vista da varanda"
        className="glass pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-stretch gap-1 rounded-2xl p-1.5"
      >
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={preset === p.id}
            onClick={() => setPreset(p.id)}
            className={`min-h-12 min-w-24 rounded-xl px-5 text-sm font-medium uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-white ${
              preset === p.id ? 'bg-white text-ink-950' : 'text-white hover:bg-white/15'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={closeWindowView}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-brand/85 focus-visible:outline-2 focus-visible:outline-white"
        >
          <ArrowLeft size={18} aria-hidden />
          Voltar ao apartamento
        </button>
      </nav>
    </>
  )
}
