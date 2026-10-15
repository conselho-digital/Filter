import { create } from 'zustand'

export type ViewMode = 'aerial' | 'tower' | 'unit' | 'blueprint' | 'windowView'

interface AppState {
  viewMode: ViewMode
  /** 0 = amanhecer, ~0.33 = dia, ~0.66 = pôr do sol, 1 = noite */
  timeOfDay: number
  setViewMode: (mode: ViewMode) => void
  setTimeOfDay: (t: number) => void
}

export const useStore = create<AppState>((set) => ({
  viewMode: 'aerial',
  timeOfDay: 0.33,
  setViewMode: (viewMode) => set({ viewMode }),
  setTimeOfDay: (t) => set({ timeOfDay: Math.min(1, Math.max(0, t)) }),
}))
