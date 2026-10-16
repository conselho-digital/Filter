import { useEffect, useMemo, useState } from 'react'
import { Layers, X } from 'lucide-react'
import { UNITS, type UnitStatus } from '../../data/units'
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/status'
import { useStore } from '../../store/useStore'

const ORDER: UnitStatus[] = ['available', 'reserved', 'sold']

/** Botão "Situação" que abre os botões de marcar: mostram na maquete só os status escolhidos, com a contagem. */
export function StatusLegend() {
  const viewMode = useStore((s) => s.viewMode)
  const statusVisible = useStore((s) => s.statusVisible)
  const toggleStatus = useStore((s) => s.toggleStatus)
  const hasUnit = useStore((s) => s.selectedUnitId !== null)

  const [open, setOpen] = useState(false)
  const activeCount = ORDER.filter((k) => statusVisible[k]).length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const counts = useMemo(() => {
    const c: Record<UnitStatus, number> = {
      available: 0,
      reserved: 0,
      sold: 0,
    }
    for (const u of UNITS) c[u.status]++
    return c
  }, [])

  if (viewMode === 'windowView') return null

  return (
    <div className={`pointer-events-none absolute bottom-24 left-4 flex flex-col items-start gap-2 ${hasUnit ? 'max-md:hidden' : ''}`}>
      {open && (
        <>
          <fieldset id="status-legend" className="glass glass-70 pointer-events-auto flex flex-col gap-1 rounded-2xl px-3 py-2">
            <legend className="sr-only">Mostrar status das unidades na maquete</legend>
            {ORDER.map((s) => (
              <label
                key={s}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-white transition-colors hover:bg-white/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white"
              >
                <input type="checkbox" checked={statusVisible[s]} onChange={() => toggleStatus(s)} className="peer sr-only" />
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
                  style={{
                    borderColor: STATUS_COLOR[s],
                    background: statusVisible[s] ? STATUS_COLOR[s] : 'transparent',
                  }}
                >
                  {statusVisible[s] && (
                    <svg
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8.5 6.5 12 13 4.5" />
                    </svg>
                  )}
                </span>
                <span className="flex-1">{STATUS_LABEL[s]}</span>
                <span className="pl-3 tabular-nums text-white/60">{counts[s]}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="status-legend"
        onClick={() => setOpen((o) => !o)}
        className="glass pointer-events-auto flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
      >
        {open ? <X size={20} aria-hidden /> : <Layers size={20} aria-hidden />}
        <span>Situação</span>
        {activeCount > 0 && (
          <span
            className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs tabular-nums"
            aria-label={`${activeCount} marcados`}
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  )
}
