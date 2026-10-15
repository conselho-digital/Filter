import { X } from 'lucide-react'
import { UNITS_BY_ID, type Unit } from '../../data/units'
import { formatArea, formatPrice, STATUS_COLOR, STATUS_LABEL } from '../../lib/status'
import { useStore } from '../../store/useStore'
import { SectionShell } from './SectionShell'

const btn =
  'min-h-12 rounded-xl bg-white/10 px-4 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white'

/** Matriz comparativa lado a lado das unidades escolhidas (até 4). */
export function ComparePanel() {
  const compareIds = useStore((s) => s.compareIds)
  const priceShownIds = useStore((s) => s.priceShownIds)
  const toggleCompare = useStore((s) => s.toggleCompare)
  const togglePrice = useStore((s) => s.togglePrice)
  const selectUnit = useStore((s) => s.selectUnit)
  const openSection = useStore((s) => s.openSection)

  const units = compareIds.map((id) => UNITS_BY_ID.get(id)).filter((u): u is Unit => !!u)

  if (units.length === 0) {
    return (
      <SectionShell title="Comparar" subtitle="Nenhuma unidade escolhida">
        <p className="max-w-md text-white/70">
          Abra um apartamento e use “Comparar unidade” para adicionar até 4 unidades e vê-las lado a lado.
        </p>
        <button type="button" className={`${btn} mt-5`} onClick={() => openSection('apartments')}>
          Escolher apartamentos
        </button>
      </SectionShell>
    )
  }

  const rows: { label: string; cell: (u: Unit) => React.ReactNode }[] = [
    { label: 'Status', cell: (u) => (
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[u.status] }} aria-hidden />
          {STATUS_LABEL[u.status]}
        </span>
      ) },
    { label: 'Área', cell: (u) => formatArea(u.area) },
    { label: 'Quartos', cell: (u) => u.bedrooms },
    { label: 'Andar', cell: (u) => `${u.floor}º` },
    { label: 'Orientação', cell: (u) => u.orientation },
    { label: 'Preço', cell: (u) =>
        priceShownIds.includes(u.id) ? (
          <span className="tabular-nums">{formatPrice(u.price)}</span>
        ) : (
          <button type="button" className="rounded-lg bg-brand px-3 py-2 text-sm text-white" onClick={() => togglePrice(u.id)}>
            Mostrar preço
          </button>
        ) },
  ]

  return (
    <SectionShell title="Comparar" subtitle={`${units.length} de 4 unidades`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-left text-white">
          <thead>
            <tr>
              <th className="w-32" />
              {units.map((u) => (
                <th key={u.id} scope="col" className="px-3 pb-2 align-bottom">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-medium tabular-nums">{u.id}</span>
                    <button
                      type="button"
                      aria-label={`Remover ${u.id} da comparação`}
                      onClick={() => toggleCompare(u.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="bg-white/5">
                <th scope="row" className="rounded-l-xl px-3 py-3 text-xs font-normal uppercase tracking-widest text-white/60">
                  {r.label}
                </th>
                {units.map((u, i) => (
                  <td key={u.id} className={`px-3 py-3 text-base ${i === units.length - 1 ? 'rounded-r-xl' : ''}`}>
                    {r.cell(u)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th />
              {units.map((u) => (
                <td key={u.id} className="px-3 pt-3">
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      selectUnit(u.id)
                      openSection(null)
                    }}
                  >
                    Ver unidade
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </SectionShell>
  )
}
