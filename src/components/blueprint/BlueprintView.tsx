import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, X } from 'lucide-react'
import { UNITS_BY_ID, UNITS_PER_FLOOR } from '../../data/units'
import { buildFloorPlan } from '../../lib/floorplan'
import { formatArea } from '../../lib/status'
import { useStore } from '../../store/useStore'

const SCALE = 48 // px por metro
const PAD = 70
const MIN_K = 0.6
const MAX_K = 4
const PAN_LIMIT = 700 // px de deslocamento máximo por unidade de zoom

const fmt = (n: number) => n.toFixed(1).replace('.', ',')

/** Planta baixa 2D da unidade selecionada, com pan e zoom por toque, roda e botões. */
export function BlueprintView() {
  const viewMode = useStore((s) => s.viewMode)
  const selectedId = useStore((s) => s.selectedUnitId)
  const closeBlueprint = useStore((s) => s.closeBlueprint)
  const printRequested = useStore((s) => s.printRequested)
  const clearPrintRequest = useStore((s) => s.clearPrintRequest)
  const unit = selectedId ? UNITS_BY_ID.get(selectedId) : undefined
  const plan = useMemo(() => (unit ? buildFloorPlan(unit) : null), [unit])

  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const open = viewMode === 'blueprint' && !!unit && !!plan

  // ao abrir (ou trocar de unidade) volta ao enquadramento inicial e descarta gestos antigos
  useEffect(() => {
    pointers.current.clear()
    pinch.current = null
    if (open) setView({ x: 0, y: 0, k: 1 })
  }, [open, selectedId])

  // foco no botão de voltar só ao abrir; ao fechar, devolve o foco a quem abriu
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => opener?.focus?.()
  }, [open])

  // impressão pedida: espera a planta montar e o enquadramento voltar ao inicial
  useEffect(() => {
    if (!open || !printRequested) return
    setView({ x: 0, y: 0, k: 1 })
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        clearPrintRequest()
        window.print()
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [open, printRequested, clearPrintRequest])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeBlueprint()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeBlueprint])

  if (!open || !unit || !plan) return null

  const vbW = plan.width * SCALE + PAD * 2
  const vbH = plan.depth * SCALE + PAD * 2
  const zoom = (factor: number) =>
    setView((v) => ({ ...v, k: Math.min(MAX_K, Math.max(MIN_K, v.k * factor)) }))

  const clampPan = (x: number, y: number, k: number) => {
    const limit = PAN_LIMIT * k
    return { x: Math.min(limit, Math.max(-limit, x)), y: Math.min(limit, Math.max(-limit, y)) }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    // gestos de planta não começam em cima dos botões (senão a captura engole o clique)
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    pinch.current = null
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length === 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (pinch.current) zoom(d / pinch.current)
      pinch.current = d
    } else if (pts.length === 1) {
      setView((v) => ({ ...v, ...clampPan(v.x + e.clientX - prev.x, v.y + e.clientY - prev.y, v.k) }))
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    pinch.current = null
  }

  const floorUnits = Array.from({ length: UNITS_PER_FLOOR }, (_, i) => i)
  const btn =
    'flex h-12 w-12 items-center justify-center rounded-full bg-[#0a0f1d] text-white shadow-md transition-colors hover:bg-[#1f2a44] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand print:hidden'

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={`Planta baixa do apartamento ${unit.id}`}
      className="print-area pointer-events-auto absolute inset-0 z-20 flex flex-col bg-[#f4f5f7] text-[#0a0f1d] md:right-[380px]"
    >
      <header className="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#0a0f1d]/50">
            Pavimento {unit.floor}
          </p>
          <h2 className="mt-1 text-2xl font-light uppercase tracking-[0.15em]">Apartamento {unit.id}</h2>
          <p className="mt-1 text-sm text-[#0a0f1d]/60">
            área total {formatArea(unit.area)} · {unit.bedrooms} {unit.bedrooms === 1 ? 'quarto' : 'quartos'} · {unit.orientation}
          </p>
        </div>
        <button ref={closeRef} type="button" aria-label="Voltar à maquete" className={btn} onClick={closeBlueprint}>
          <X size={22} />
        </button>
      </header>

      <div
        className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onWheel={(e) => zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
      >
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="h-full w-full"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
          role="img"
          aria-label={`Planta de ${formatArea(unit.area)} com ${plan.rooms.map((r) => r.name).join(', ')}`}
        >
          <g transform={`translate(${PAD} ${PAD})`} fontFamily="Inter, system-ui, sans-serif">
            {plan.rooms.map((r) => (
              <g key={r.name}>
                <rect
                  x={r.x * SCALE}
                  y={r.y * SCALE}
                  width={r.w * SCALE}
                  height={r.h * SCALE}
                  fill={r.outdoor ? '#e3ece0' : '#ffffff'}
                  stroke="#2b3345"
                  strokeWidth={r.outdoor ? 2 : 4}
                  strokeDasharray={r.outdoor ? '10 6' : undefined}
                />
                <text
                  x={(r.x + r.w / 2) * SCALE}
                  y={(r.y + r.h / 2) * SCALE - 4}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={600}
                  fill="#0a0f1d"
                >
                  {r.name}
                </text>
                <text
                  x={(r.x + r.w / 2) * SCALE}
                  y={(r.y + r.h / 2) * SCALE + 14}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#0a0f1d"
                  opacity={0.55}
                >
                  {fmt(r.w)} × {fmt(r.h)} m
                </text>
              </g>
            ))}
            {/* cotas gerais */}
            <g stroke="#0a0f1d" strokeOpacity={0.45} fill="#0a0f1d" fontSize={13}>
              <line x1={0} y1={-26} x2={plan.width * SCALE} y2={-26} />
              <text x={(plan.width * SCALE) / 2} y={-34} textAnchor="middle" stroke="none">
                {fmt(plan.width)} m
              </text>
              <line x1={-26} y1={0} x2={-26} y2={plan.depth * SCALE} />
              <text
                x={-34}
                y={(plan.depth * SCALE) / 2}
                textAnchor="middle"
                stroke="none"
                transform={`rotate(-90 -34 ${(plan.depth * SCALE) / 2})`}
              >
                {fmt(plan.depth)} m
              </text>
            </g>
            <text x={plan.width * SCALE} y={plan.depth * SCALE + 38} textAnchor="end" fontSize={12} fill="#0a0f1d" opacity={0.5}>
              Vista para o {unit.orientation.toLowerCase() === 'mar' ? 'mar' : unit.orientation} ↑ (varanda)
            </text>
          </g>
        </svg>

        {/* mini-planta do pavimento */}
        <figure role="group" className="absolute bottom-4 left-4 rounded-xl bg-white/90 p-3 shadow-md" aria-label={`Posição no pavimento ${unit.floor}`}>
          <svg width={150} height={44} viewBox="0 0 150 44" aria-hidden>
            {floorUnits.map((i) => (
              <rect
                key={i}
                x={i * 30 + 1}
                y={2}
                width={28}
                height={40}
                rx={3}
                fill={i === unit.slot ? '#2f8cff' : '#dfe3ea'}
              />
            ))}
          </svg>
          <figcaption className="mt-1 text-center text-[11px] uppercase tracking-widest text-[#0a0f1d]/55">
            Nível {unit.floor}
          </figcaption>
        </figure>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button type="button" aria-label="Aproximar planta" className={btn} onClick={() => zoom(1.25)}>
            <Plus size={22} />
          </button>
          <button type="button" aria-label="Afastar planta" className={btn} onClick={() => zoom(1 / 1.25)}>
            <Minus size={22} />
          </button>
          <button type="button" aria-label="Centralizar planta" className={btn} onClick={() => setView({ x: 0, y: 0, k: 1 })}>
            <Maximize2 size={20} />
          </button>
        </div>
      </div>
    </section>
  )
}
