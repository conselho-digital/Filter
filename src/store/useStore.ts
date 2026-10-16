import { create } from 'zustand'
import { UNITS, UNITS_BY_ID, type UnitStatus } from '../data/units'
import { setAreaUnitFormat } from '../lib/status'
import { DEFAULT_FILTERS, matchesFilters, sanitizeQuery, type Filters } from '../lib/filters'

export type Section = 'apartments' | 'compare' | 'location' | 'gallery' | 'highlights'

export type WindowViewPreset = 'view1' | 'view2'

export type Weather = 'clear' | 'clouds' | 'rain'
export type Quality = 'high' | 'low'
export type AreaUnit = 'm2' | 'ft2'

export type ViewMode = 'aerial' | 'tower' | 'unit' | 'blueprint' | 'plan3d' | 'windowView'

interface AppState {
  viewMode: ViewMode
  /** 0 = amanhecer, ~0.33 = dia, ~0.66 = pôr do sol, 1 = noite */
  timeOfDay: number
  selectedUnitId: string | null
  hoveredUnitId: string | null
  /** unidades cujo preço o corretor já revelou */
  priceShownIds: string[]
  compareIds: string[]
  favoriteIds: string[]
  /** pedido de impressão aguardando a planta montar */
  printRequested: boolean
  windowViewPreset: WindowViewPreset
  filters: Filters
  /** quais status aparecem coloridos na maquete (todos desligados no início) */
  statusVisible: Record<UnitStatus, boolean>
  /** seção aberta pelo menu inferior (cobre a maquete) */
  section: Section | null
  weather: Weather
  quality: Quality
  areaUnit: AreaUnit
  /** tour automático: a câmera gira em volta da torre até o primeiro toque */
  touring: boolean
  setWeather: (w: Weather) => void
  cycleWeather: () => void
  setQuality: (q: Quality) => void
  setAreaUnit: (u: AreaUnit) => void
  setTouring: (on: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setTimeOfDay: (t: number) => void
  selectUnit: (id: string | null) => void
  stepUnit: (delta: 1 | -1) => void
  setHoveredUnit: (id: string | null) => void
  togglePrice: (id: string) => void
  openBlueprint: () => void
  openPlan3d: () => void
  closePlan3d: () => void
  openWindowView: () => void
  setFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
  toggleStatus: (s: UnitStatus) => void
  openSection: (s: Section | null) => void
  closeWindowView: () => void
  setWindowViewPreset: (p: WindowViewPreset) => void
  closeBlueprint: () => void
  requestPrint: () => void
  clearPrintRequest: () => void
  /** zera tudo que é do cliente (favoritos, comparação, preços, seleção) para o próximo visitante */
  resetSession: () => void
  toggleCompare: (id: string) => void
  toggleFavorite: (id: string) => void
}

const NO_STATUS: Record<UnitStatus, boolean> = { available: false, reserved: false, sold: false }
const MAX_COMPARE = 4
const toggleIn = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

export const useStore = create<AppState>((set, get) => ({
  viewMode: 'aerial',
  timeOfDay: 0.33,
  selectedUnitId: null,
  hoveredUnitId: null,
  priceShownIds: [],
  compareIds: [],
  favoriteIds: [],
  printRequested: false,
  windowViewPreset: 'view1',
  filters: DEFAULT_FILTERS,
  statusVisible: NO_STATUS,
  section: null,
  weather: 'clear',
  quality: 'high',
  areaUnit: 'm2',
  touring: false,
  setWeather: (weather) => set({ weather }),
  cycleWeather: () => set((s) => ({ weather: s.weather === 'clear' ? 'clouds' : s.weather === 'clouds' ? 'rain' : 'clear' })),
  setQuality: (quality) => set({ quality }),
  setAreaUnit: (areaUnit) => {
    setAreaUnitFormat(areaUnit)
    set({ areaUnit })
  },
  setTouring: (touring) => set({ touring }),
  setViewMode: (viewMode) =>
    set((s) => {
      if (viewMode === 'aerial' || viewMode === 'tower') {
        return { viewMode, selectedUnitId: null, hoveredUnitId: null, priceShownIds: [] }
      }
      // planta, unidade e vista da varanda só fazem sentido com uma unidade escolhida
      return s.selectedUnitId ? { viewMode } : {}
    }),
  setTimeOfDay: (t) => set({ timeOfDay: Math.min(1, Math.max(0, t)) }),
  selectUnit: (id) => {
    if (id && !UNITS_BY_ID.has(id)) return
    if (id) {
      set({ selectedUnitId: id, hoveredUnitId: null, viewMode: 'unit', touring: false })
      return
    }
    // fechar a unidade volta à maquete, mas não tira o usuário da planta ou da vista da varanda
    set((s) => {
      const leaving = s.viewMode === 'unit' || s.viewMode === 'tower' || s.viewMode === 'blueprint' || s.viewMode === 'plan3d'
      return {
        selectedUnitId: leaving ? null : s.selectedUnitId,
        hoveredUnitId: null,
        viewMode: leaving ? 'aerial' : s.viewMode,
        priceShownIds: leaving ? [] : s.priceShownIds,
        printRequested: false,
      }
    })
  },
  stepUnit: (delta) => {
    const { selectedUnitId, filters } = get()
    const pool = UNITS.filter((u) => u.id === selectedUnitId || matchesFilters(u, filters))
    const i = pool.findIndex((u) => u.id === selectedUnitId)
    if (i < 0) return
    const next = pool[(i + delta + pool.length) % pool.length]
    set({ selectedUnitId: next.id, hoveredUnitId: null })
  },
  setHoveredUnit: (id) => set({ hoveredUnitId: id }),
  togglePrice: (id) =>
    set((s) => ({
      priceShownIds: s.priceShownIds.includes(id)
        ? s.priceShownIds.filter((x) => x !== id)
        : [...s.priceShownIds, id],
    })),
  requestPrint: () =>
    set((s) => (s.selectedUnitId ? { viewMode: 'blueprint', printRequested: true, section: null } : {})),
  clearPrintRequest: () => set({ printRequested: false }),
  resetSession: () => {
    setAreaUnitFormat('m2')
    set({
      viewMode: 'aerial',
      selectedUnitId: null,
      hoveredUnitId: null,
      priceShownIds: [],
      compareIds: [],
      favoriteIds: [],
      printRequested: false,
      windowViewPreset: 'view1',
      filters: DEFAULT_FILTERS,
      statusVisible: NO_STATUS,
      section: null,
      weather: 'clear',
      areaUnit: 'm2',
      touring: false,
    })
  },
  setFilters: (patch) =>
    set((s) => ({
      filters: {
        ...s.filters,
        ...patch,
        ...(patch.query !== undefined ? { query: sanitizeQuery(patch.query) } : {}),
      },
    })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  toggleStatus: (status) => set((s) => ({ statusVisible: { ...s.statusVisible, [status]: !s.statusVisible[status] } })),
  openSection: (section) =>
    set((s) =>
      // seções cobrem a maquete: fecham unidade/planta/varanda para o estado ficar coerente
      section
        ? { section, ...(s.viewMode === 'windowView' ? {} : { viewMode: s.selectedUnitId ? 'unit' : s.viewMode }) }
        : { section: null },
    ),
  openWindowView: () =>
    set((s) => (s.selectedUnitId ? { viewMode: 'windowView', windowViewPreset: 'view1', hoveredUnitId: null, section: null } : {})),
  closeWindowView: () => set((s) => (s.viewMode === 'windowView' ? { viewMode: 'unit' } : {})),
  setWindowViewPreset: (windowViewPreset) => set((s) => (s.viewMode === 'windowView' ? { windowViewPreset } : {})),
  openPlan3d: () => set((s) => (s.selectedUnitId ? { viewMode: 'plan3d', section: null } : {})),
  closePlan3d: () => set((s) => (s.viewMode === 'plan3d' ? { viewMode: 'unit' } : {})),
  openBlueprint: () => set((s) => (s.selectedUnitId ? { viewMode: 'blueprint', section: null } : {})),
  closeBlueprint: () => set((s) => (s.viewMode === 'blueprint' ? { viewMode: 'unit' } : {})),
  toggleCompare: (id) => {
    if (!UNITS_BY_ID.has(id)) return
    set((s) =>
      s.compareIds.includes(id) || s.compareIds.length < MAX_COMPARE
        ? { compareIds: toggleIn(s.compareIds, id) }
        : {},
    )
  },
  toggleFavorite: (id) => {
    if (!UNITS_BY_ID.has(id)) return
    set((s) => ({ favoriteIds: toggleIn(s.favoriteIds, id) }))
  },
}))
