import { create } from 'zustand'
import { UNITS, UNITS_BY_ID } from '../data/units'

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
  setViewMode: (mode: ViewMode) => void
  setTimeOfDay: (t: number) => void
  selectUnit: (id: string | null) => void
  stepUnit: (delta: 1 | -1) => void
  setHoveredUnit: (id: string | null) => void
  togglePrice: (id: string) => void
  openBlueprint: () => void
  closeBlueprint: () => void
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
  setViewMode: (viewMode) =>
    set(
      viewMode === 'aerial' || viewMode === 'tower'
        ? { viewMode, selectedUnitId: null, hoveredUnitId: null, priceShownIds: [] }
        : { viewMode },
    ),
  setTimeOfDay: (t) => set({ timeOfDay: Math.min(1, Math.max(0, t)) }),
  selectUnit: (id) => {
    if (id && !UNITS_BY_ID.has(id)) return
    if (id) {
      set({ selectedUnitId: id, hoveredUnitId: null, viewMode: 'unit' })
      return
    }
    // fechar a unidade volta à maquete, mas não tira o usuário da planta ou da vista da varanda
    set((s) => ({
      selectedUnitId: s.viewMode === 'unit' || s.viewMode === 'tower' ? null : s.selectedUnitId,
      hoveredUnitId: null,
      viewMode: s.viewMode === 'unit' || s.viewMode === 'tower' ? 'aerial' : s.viewMode,
      priceShownIds: s.viewMode === 'unit' || s.viewMode === 'tower' ? [] : s.priceShownIds,
    }))
  },
  stepUnit: (delta) => {
    const { selectedUnitId } = get()
    const i = UNITS.findIndex((u) => u.id === selectedUnitId)
    if (i < 0) return
    const next = UNITS[(i + delta + UNITS.length) % UNITS.length]
    set({ selectedUnitId: next.id, hoveredUnitId: null })
  },
  setHoveredUnit: (id) => set({ hoveredUnitId: id }),
  togglePrice: (id) =>
    set((s) => ({
      priceShownIds: s.priceShownIds.includes(id)
        ? s.priceShownIds.filter((x) => x !== id)
        : [...s.priceShownIds, id],
    })),
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
