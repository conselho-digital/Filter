import { useEffect, useState } from 'react'
import {
  AppWindow,
  Box,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  GitCompareArrows,
  Heart,
  Printer,
  Send,
  TrendingUp,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { UNITS_BY_ID } from '../../data/units'
import { formatArea, formatPrice, STATUS_COLOR, STATUS_LABEL } from '../../lib/status'
import { useStore } from '../../store/useStore'

function Action({
  icon,
  children,
  onClick,
  disabled,
  active,
  hint,
}: {
  icon: ReactNode
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-medium uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-white text-ink-950' : 'bg-white/10 text-white enabled:hover:bg-white/20'
      }`}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {disabled && hint && <span className="text-[10px] normal-case tracking-normal opacity-70">{hint}</span>}
    </button>
  )
}

const iconBtn =
  'flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-brand'

/** Painel lateral com os dados da unidade selecionada. */
export function UnitPanel() {
  const selectedId = useStore((s) => s.selectedUnitId)
  useStore((s) => s.areaUnit) // refaz os textos ao trocar m²/ft²
  const priceShownIds = useStore((s) => s.priceShownIds)
  const selectUnit = useStore((s) => s.selectUnit)
  const stepUnit = useStore((s) => s.stepUnit)
  const togglePrice = useStore((s) => s.togglePrice)
  const viewMode = useStore((s) => s.viewMode)
  const requestPrint = useStore((s) => s.requestPrint)
  const openWindowView = useStore((s) => s.openWindowView)
  const openPlan3d = useStore((s) => s.openPlan3d)
  const openFloorPlan = useStore((s) => s.openFloorPlan)
  const compareIds = useStore((s) => s.compareIds)
  const toggleCompare = useStore((s) => s.toggleCompare)
  const favoriteIds = useStore((s) => s.favoriteIds)
  const toggleFavorite = useStore((s) => s.toggleFavorite)

  const unit = selectedId ? UNITS_BY_ID.get(selectedId) : undefined
  // painel recolhido: metade da altura (a maquete fica mais visível)
  const [compact, setCompact] = useState(true)

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      // na planta, o Esc fecha só a planta (tratado por ela)
      if (e.key === 'Escape' && viewMode === 'unit' && useStore.getState().section === null) selectUnit(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, selectUnit, viewMode])

  // na vista da varanda o painel sai de cena (a barra inferior assume)
  // na varanda, na planta 2D e no apartamento em 3D (telas cheias) o painel sai de cena
  if (!unit || viewMode === 'windowView' || viewMode === 'blueprint' || viewMode === 'plan3d') return null
  const priceShown = priceShownIds.includes(unit.id)
  const favorite = favoriteIds.includes(unit.id)
  const comparing = compareIds.includes(unit.id)
  const compareFull = !comparing && compareIds.length >= 4


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
      // computador: altura toda da página e 760 px de largura; celular: folha inferior recolhível
      className={`glass glass-panel pointer-events-auto absolute bottom-0 right-0 z-10 flex ${viewMode === 'floorplan' ? 'max-md:hidden' : ''} flex-col gap-5 overflow-y-auto overscroll-contain p-6 pb-6 pt-2 md:top-0 md:w-[min(100vw,760px)] md:rounded-l-3xl md:pt-24 max-md:w-full max-md:rounded-t-3xl ${
        compact ? 'max-md:max-h-[30%]' : 'max-md:max-h-[60%]'
      }`}
    >
      <button
        type="button"
        aria-label={compact ? 'Aumentar painel' : 'Diminuir painel'}
        aria-expanded={!compact}
        onClick={() => setCompact((c) => !c)}
        className="mx-auto flex h-8 w-24 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-brand md:hidden"
      >
        <span className="h-1.5 w-12 rounded-full bg-white/45" aria-hidden />
      </button>
      <header className="flex items-center gap-2">
        <button type="button" aria-label="Unidade anterior" className={iconBtn} onClick={() => stepUnit(-1)}>
          <ChevronLeft size={22} />
        </button>
        <h2 aria-live="polite" className="flex-1 text-center text-lg font-medium uppercase tracking-[0.18em] text-white">
          Apartamento {unit.id}
        </h2>
        <button type="button" aria-label="Próxima unidade" className={iconBtn} onClick={() => stepUnit(1)}>
          <ChevronRight size={22} />
        </button>
        <button type="button" aria-label="Fechar" className={iconBtn} onClick={() => selectUnit(null)}>
          <X size={22} />
        </button>
      </header>

      <div className="flex items-center justify-between gap-3">
      <div
        className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white"
        style={{ background: `${STATUS_COLOR[unit.status]}33`, border: `1px solid ${STATUS_COLOR[unit.status]}` }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[unit.status] }} aria-hidden />
        {STATUS_LABEL[unit.status]}
      </div>
        <button
          type="button"
          aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={favorite}
          className={iconBtn}
          onClick={() => toggleFavorite(unit.id)}
        >
          <Heart size={22} fill={favorite ? '#e0443e' : 'none'} color={favorite ? '#e0443e' : 'currentColor'} />
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/5 px-4 py-3">
            <dt className="text-xs uppercase tracking-widest text-white/50">{label}</dt>
            <dd className="mt-1 text-lg tabular-nums text-white">{value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={() => togglePrice(unit.id)}
        className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-brand px-5 text-base font-medium text-white transition-colors hover:bg-brand/85 focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="tabular-nums">{priceShown ? formatPrice(unit.price) : 'Mostrar preço'}</span>
        {priceShown ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>

      <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
        <Action icon={<AppWindow size={20} />} onClick={openWindowView}>
          Window View
        </Action>
        <Action icon={<Box size={20} />} onClick={openPlan3d}>
          Apartamento em 3D
        </Action>
        <Action icon={<FileText size={20} />} onClick={openFloorPlan} active={viewMode === 'floorplan'}>
          Planta do apartamento
        </Action>
        <Action icon={<Printer size={20} />} onClick={requestPrint}>
          Imprimir planta
        </Action>
        <Action icon={<Send size={20} />} disabled hint="em breve">
          Enviar planta
        </Action>
        <Action icon={<TrendingUp size={20} />} disabled hint="em breve">
          Simular investimento
        </Action>
        <Action
          icon={<GitCompareArrows size={20} />}
          onClick={() => toggleCompare(unit.id)}
          active={comparing}
          disabled={compareFull}
          hint={compareFull ? 'máx. 4' : undefined}
        >
          {comparing ? `Comparando (${compareIds.length})` : `Comparar unidade (${compareIds.length})`}
        </Action>
        <Action icon={<CalendarDays size={20} />} disabled hint="em breve">
          Agendar / Contato
        </Action>
      </div>
    </aside>
  )
}
