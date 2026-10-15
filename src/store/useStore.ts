import { create } from 'zustand'
import { UNITS } from '../data/units'

export type ViewMode = 'aerial' | 'tower' | 'unit' | 'blueprint' | 'windowView'

interface AppState {
  viewMode: ViewMode
  /** 0 = amanhecer, ~0.33 = dia, ~0.66 = pôr do sol, 1 = noite */
  timeOfDay: number
  selectedUnitId: string | null
  hoveredUnitId: string | null
  /** unidades cujo preço o corretor já revelou */
  priceShownIds: string[]
  setViewMode: (mode: ViewMode) => void
  setTimeOfDay: (t: number) => void
  selectUnit: (id: string | null) => void
  stepUnit: (delta: 1 | -1) => void
  setHoveredUnit: (id: string | null) => void
  togglePrice: (id: string) => void
}

export const useStore = create<AppState>((set, get) => ({
  viewMode: 'aerial',
  timeOfDay: 0.33,
  selectedUnitId: null,
  hoveredUnitId: null,
  priceShownIds: [],
  setViewMode: (viewMode) => set({ viewMode }),
  setTimeOfDay: (t) => set({ timeOfDay: Math.min(1, Math.max(0, t)) }),
  selectUnit: (id) => set({ selectedUnitId: id, viewMode: id ? 'unit' : 'aerial' }),
  stepUnit: (delta) => {
    const { selectedUnitId } = get()
    const i = UNITS.findIndex((u) => u.id === selectedUnitId)
    if (i < 0) return
    const next = UNITS[(i + delta + UNITS.length) % UNITS.length]
    set({ selectedUnitId: next.id })
  },
  setHoveredUnit: (id) => set({ hoveredUnitId: id }),
  togglePrice: (id) =>
    set((s) => ({
      priceShownIds: s.priceShownIds.includes(id)
        ? s.priceShownIds.filter((x) => x !== id)
        : [...s.priceShownIds, id],
    })),
}))
