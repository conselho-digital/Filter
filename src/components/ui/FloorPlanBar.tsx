import { useEffect } from 'react'
import { ArrowLeft, Box, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { MAIN_TOWER_FLOORS, UNITS_BY_ID } from '../../data/units'
import { useStore } from '../../store/useStore'

const btn =
  'flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40'

/** Barra da planta em corte: troca de andar, planta 2D (impressão), apartamento em 3D e voltar ao prédio. */
export function FloorPlanBar() {
  const viewMode = useStore((s) => s.viewMode)
  const selectedId = useStore((s) => s.selectedUnitId)
  const stepFloor = useStore((s) => s.stepFloor)
  const closeFloorPlan = useStore((s) => s.closeFloorPlan)
  const openBlueprint = useStore((s) => s.openBlueprint)
  const openPlan3d = useStore((s) => s.openPlan3d)
  const open = viewMode === 'floorplan'
  const unit = selectedId ? UNITS_BY_ID.get(selectedId) : undefined

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeFloorPlan()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeFloorPlan])

  if (!open || !unit) return null

  return (
    <nav
      aria-label="Planta no prédio"
      className="glass glass-panel pointer-events-auto absolute bottom-4 left-1/2 z-30 flex max-w-[96vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl p-1.5 md:left-[calc(50%-380px)]"
    >
      <button type="button" className={btn} onClick={() => stepFloor(-1)} disabled={unit.floor <= 1} aria-label="Andar de baixo">
        <ChevronDown size={20} aria-hidden />
      </button>
      <span className="min-w-24 px-2 text-center text-sm font-medium uppercase tracking-widest text-white" aria-live="polite">
        {unit.floor}º andar
      </span>
      <button type="button" className={btn} onClick={() => stepFloor(1)} disabled={unit.floor >= MAIN_TOWER_FLOORS} aria-label="Andar de cima">
        <ChevronUp size={20} aria-hidden />
      </button>
      <button type="button" className={btn} onClick={openBlueprint}>
        <FileText size={20} aria-hidden />
        <span className="max-md:sr-only">Planta 2D</span>
      </button>
      <button type="button" className={btn} onClick={openPlan3d}>
        <Box size={20} aria-hidden />
        <span className="max-md:sr-only">Em 3D</span>
      </button>
      <button type="button" className={`${btn} bg-brand hover:bg-brand/80`} onClick={closeFloorPlan}>
        <ArrowLeft size={20} aria-hidden />
        <span>Voltar ao prédio</span>
      </button>
    </nav>
  )
}
