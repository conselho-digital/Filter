import { ChevronLeft, ChevronRight, Eye, EyeOff, X } from 'lucide-react'
import { UNITS_BY_ID } from '../../data/units'
import { formatArea, formatPrice, STATUS_COLOR, STATUS_LABEL } from '../../lib/status'
import { useStore } from '../../store/useStore'

const iconBtn =
  'flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-brand'

/** Painel lateral com os dados da unidade selecionada. */
export function UnitPanel() {
  const selectedId = useStore((s) => s.selectedUnitId)
  const priceShownIds = useStore((s) => s.priceShownIds)
  const selectUnit = useStore((s) => s.selectUnit)
  const stepUnit = useStore((s) => s.stepUnit)
  const togglePrice = useStore((s) => s.togglePrice)

  const unit = selectedId ? UNITS_BY_ID.get(selectedId) : undefined
  if (!unit) return null
  const priceShown = priceShownIds.includes(unit.id)

  const facts: [string, string][] = [
    ['Área', formatArea(unit.area)],
    ['Quartos', String(unit.bedrooms)],
    ['Andar', String(unit.floor)],
    ['Número', unit.id],
    ['Orientação', unit.orientation],
  ]

  return (
    <aside
      aria-label={`Detalhes do apartamento ${unit.id}`}
      className="glass pointer-events-auto absolute bottom-0 right-0 top-24 z-10 flex w-[min(100vw,380px)] flex-col gap-5 rounded-l-3xl p-6 max-md:top-auto max-md:max-h-[60%] max-md:w-full max-md:rounded-l-none max-md:rounded-t-3xl"
    >
      <header className="flex items-center gap-2">
        <button type="button" aria-label="Unidade anterior" className={iconBtn} onClick={() => stepUnit(-1)}>
          <ChevronLeft size={22} />
        </button>
        <h2 className="flex-1 text-center text-lg font-medium uppercase tracking-[0.18em] text-white">
          Apartamento {unit.id}
        </h2>
        <button type="button" aria-label="Próxima unidade" className={iconBtn} onClick={() => stepUnit(1)}>
          <ChevronRight size={22} />
        </button>
        <button type="button" aria-label="Fechar" className={iconBtn} onClick={() => selectUnit(null)}>
          <X size={22} />
        </button>
      </header>

      <div
        className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white"
        style={{ background: `${STATUS_COLOR[unit.status]}33`, border: `1px solid ${STATUS_COLOR[unit.status]}` }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[unit.status] }} aria-hidden />
        {STATUS_LABEL[unit.status]}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/5 px-4 py-3">
            <dt className="text-xs uppercase tracking-widest text-white/50">{label}</dt>
            <dd className="mt-1 text-lg tabular-nums text-white">{value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        aria-pressed={priceShown}
        onClick={() => togglePrice(unit.id)}
        className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-brand px-5 text-base font-medium text-white transition-colors hover:bg-brand/85 focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="tabular-nums">{priceShown ? formatPrice(unit.price) : 'Mostrar preço'}</span>
        {priceShown ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </aside>
  )
}
