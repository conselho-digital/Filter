import { create } from 'zustand'
import { UNITS, UNITS_BY_ID } from '../data/units'
import { DEFAULT_FILTERS, matchesFilters, sanitizeQuery, type Filters } from '../lib/filters'

export type Section = 'apartments' | 'compare' | 'location' | 'gallery' | 'highlights'

export type WindowViewPreset = 'view1' | 'view2'

export type ViewMode = 'aerial' | 'tower' | 'unit' | 'blueprint' | 'windowView'

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
  /** seção aberta pelo menu inferior (cobre a maquete) */
  section: Section | null
  setViewMode: (mode: ViewMode) => void
  setTimeOfDay: (t: number) => void
  selectUnit: (id: string | null) => void
  stepUnit: (delta: 1 | -1) => void
  setHoveredUnit: (id: string | null) => void
  togglePrice: (id: string) => void
  openBlueprint: () => void
  openWindowView: () => void
  setFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
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
  section: null,
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
      set({ selectedUnitId: id, hoveredUnitId: null, viewMode: 'unit' })
      return
    }
    // fechar a unidade volta à maquete, mas não tira o usuário da planta ou da vista da varanda
    set((s) => {
      const leaving = s.viewMode === 'unit' || s.viewMode === 'tower' || s.viewMode === 'blueprint'
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
    set((s) => (s.selectedUnitId ? { viewMode: 'blueprint', printRequested: true } : {})),
  clearPrintRequest: () => set({ printRequested: false }),
  resetSession: () =>
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
      section: null,
    }),
  setFilters: (patch) =>
    set((s) => ({
      filters: {
        ...s.filters,
        ...patch,
        ...(patch.query !== undefined ? { query: sanitizeQuery(patch.query) } : {}),
      },
    })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  openSection: (section) =>
    set((s) =>
      // seções cobrem a maquete: fecham unidade/planta/varanda para o estado ficar coerente
      section
        ? { section, ...(s.viewMode === 'windowView' ? {} : { viewMode: s.selectedUnitId ? 'unit' : s.viewMode }) }
        : { section: null },
    ),
  openWindowView: () =>
    set((s) => (s.selectedUnitId ? { viewMode: 'windowView', windowViewPreset: 'view1', hoveredUnitId: null } : {})),
  closeWindowView: () => set((s) => (s.viewMode === 'windowView' ? { viewMode: 'unit' } : {})),
  setWindowViewPreset: (windowViewPreset) => set((s) => (s.viewMode === 'windowView' ? { windowViewPreset } : {})),
  openBlueprint: () => set((s) => (s.selectedUnitId ? { viewMode: 'blueprint' } : {})),
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
