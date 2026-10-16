import { useMemo } from 'react'
import { UNITS } from '../../data/units'
import { BOUNDS, isDefaultFilters, matchesFilters, MAX_QUERY_LENGTH } from '../../lib/filters'
import { formatArea, formatPrice, STATUS_COLOR, STATUS_LABEL, typology } from '../../lib/status'
import { useStore } from '../../store/useStore'
import { SectionShell } from './SectionShell'

const chip = (on: boolean) =>
  `min-h-12 min-w-14 rounded-xl px-4 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${
    on ? 'bg-white text-ink-950' : 'bg-white/10 text-white hover:bg-white/20'
  }`

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs uppercase tracking-widest text-white/60">
        {label}
        <span className="text-sm normal-case tracking-normal text-white">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="time-range mt-1 h-8 w-full cursor-pointer"
      />
    </label>
  )
}

/** Gaveta de apartamentos: filtros ao vivo e lista; o que não passa no filtro some da maquete. */
export function ApartmentsPanel() {
  const filters = useStore((s) => s.filters)
  useStore((s) => s.areaUnit) // refaz os textos ao trocar m²/ft²
  const setFilters = useStore((s) => s.setFilters)
  const resetFilters = useStore((s) => s.resetFilters)
  const selectUnit = useStore((s) => s.selectUnit)
  const openSection = useStore((s) => s.openSection)

  const results = useMemo(
    () =>
      UNITS.filter((u) => matchesFilters(u, filters)).sort((a, b) => b.floor - a.floor || a.slot - b.slot),
    [filters],
  )
  const toggleRoom = (n: number) =>
    setFilters({ rooms: filters.rooms.includes(n) ? filters.rooms.filter((r) => r !== n) : [...filters.rooms, n] })

  return (
    <SectionShell title="Apartamentos" subtitle={`${results.length} de ${UNITS.length} unidades`} drawer>
      <div className="flex flex-col gap-5">
        <fieldset>
          <legend className="mb-2 text-xs uppercase tracking-widest text-white/60">Quartos</legend>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" aria-pressed={filters.rooms.includes(n)} className={chip(filters.rooms.includes(n))} onClick={() => toggleRoom(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <Range
          label="Área mínima"
          value={filters.areaRange[0]}
          min={BOUNDS.area[0]}
          max={BOUNDS.area[1]}
          step={1}
          onChange={(v) => setFilters({ areaRange: [Math.min(v, filters.areaRange[1]), filters.areaRange[1]] })}
          format={(v) => `${v} m²`}
        />
        <Range
          label="Área máxima"
          value={filters.areaRange[1]}
          min={BOUNDS.area[0]}
          max={BOUNDS.area[1]}
          step={1}
          onChange={(v) => setFilters({ areaRange: [filters.areaRange[0], Math.max(v, filters.areaRange[0])] })}
          format={(v) => `${v} m²`}
        />
        <Range
          label="Andar a partir de"
          value={filters.floorRange[0]}
          min={BOUNDS.floor[0]}
          max={BOUNDS.floor[1]}
          step={1}
          onChange={(v) => setFilters({ floorRange: [Math.min(v, filters.floorRange[1]), filters.floorRange[1]] })}
          format={(v) => `${v}º`}
        />
        <Range
          label="Andar até"
          value={filters.floorRange[1]}
          min={BOUNDS.floor[0]}
          max={BOUNDS.floor[1]}
          step={1}
          onChange={(v) => setFilters({ floorRange: [filters.floorRange[0], Math.max(v, filters.floorRange[0])] })}
          format={(v) => `${v}º`}
        />
        <Range
          label="Preço máximo"
          value={filters.maxPrice}
          min={BOUNDS.price[0]}
          max={BOUNDS.price[1]}
          step={50000}
          onChange={(v) => setFilters({ maxPrice: v })}
          format={formatPrice}
        />

        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-white">
          <input
            type="checkbox"
            checked={filters.onlyAvailable}
            onChange={(e) => setFilters({ onlyAvailable: e.target.checked })}
            className="h-6 w-6 accent-[#3b82f6]"
          />
          Mostrar só disponíveis
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-white/60">Buscar unidade</span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={MAX_QUERY_LENGTH}
            placeholder="ex.: B1804"
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            className="mt-1 min-h-12 w-full rounded-xl bg-white/10 px-4 text-base text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-brand"
          />
        </label>

        <button
          type="button"
          onClick={resetFilters}
          disabled={isDefaultFilters(filters)}
          className="min-h-12 rounded-xl bg-white/10 text-sm font-medium uppercase tracking-wider text-white transition-colors enabled:hover:bg-white/20 disabled:opacity-40"
        >
          Limpar filtros
        </button>

        <ul className="flex flex-col gap-2" aria-label="Unidades que atendem aos filtros">
          {results.length === 0 && <li className="py-6 text-center text-white/60">Nenhuma unidade com esses filtros.</li>}
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  selectUnit(u.id)
                  openSection(null)
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-white/5 px-4 text-left transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: STATUS_COLOR[u.status] }} aria-hidden />
                <span className="w-16 font-medium tabular-nums text-white">{u.id}</span>
                <span className="flex-1 text-sm text-white/70">
                  {typology(u.bedrooms)} · {u.floor}º andar · {formatArea(u.area)}
                </span>
                <span className="sr-only">{STATUS_LABEL[u.status]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}
