import { useMemo } from 'react'
import { UNITS, type UnitStatus } from '../../data/units'
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/status'
import { useStore } from '../../store/useStore'

const ORDER: UnitStatus[] = ['available', 'reserved', 'sold']

/** Legenda de status com a contagem de unidades da torre. */
export function StatusLegend() {
  const viewMode = useStore((s) => s.viewMode)
  const counts = useMemo(() => {
    const c: Record<UnitStatus, number> = { available: 0, reserved: 0, sold: 0 }
    for (const u of UNITS) c[u.status]++
    return c
  }, [])

  if (viewMode === 'windowView') return null

  return (
    <ul className="glass pointer-events-auto absolute bottom-4 left-4 flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm">
      {ORDER.map((s) => (
        <li key={s} className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} aria-hidden />
          <span className="text-white/90">{STATUS_LABEL[s]}</span>
          <span className="ml-auto pl-4 tabular-nums text-white/60">{counts[s]}</span>
        </li>
      ))}
    </ul>
  )
}
