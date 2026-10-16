import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react'
import { BlueprintView } from './components/blueprint/BlueprintView'
import { useIdleReset } from './hooks/useIdleReset'
import { Sections } from './components/sections/Sections'
import { BottomNav } from './components/ui/BottomNav'
import { CornerButtons } from './components/ui/CornerButtons'
import { FloorButtons } from './components/ui/FloorButtons'
import { FloorPlanBar } from './components/ui/FloorPlanBar'
import { TopControls } from './components/ui/TopControls'
import { StatusLegend } from './components/ui/StatusLegend'
import { TimeSlider } from './components/ui/TimeSlider'
import { UnitPanel } from './components/ui/UnitPanel'
import { WindowViewBar } from './components/ui/WindowViewBar'

// a cena 3D e a vista do apartamento saem do pacote inicial (carregam depois, com tela de espera)
const Scene = lazy(() => import('./components/scene/Scene').then((m) => ({ default: m.Scene })))
const Apartment3DView = lazy(() => import('./components/apartment/Apartment3DView').then((m) => ({ default: m.Apartment3DView })))

const Loading = () => (
  <div className="flex h-full w-full items-center justify-center bg-ink-950 text-sm uppercase tracking-[0.3em] text-white/70">
    Carregando maquete…
  </div>
)

/** Perda de contexto WebGL ou falha ao carregar a cena: mensagem e botão para recarregar. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center text-white/80">
        <p>Não foi possível exibir a maquete 3D.</p>
        <button type="button" className="min-h-12 rounded-xl bg-brand px-6 text-white" onClick={() => location.reload()}>
          Recarregar
        </button>
      </div>
    )
  }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const webgl = useMemo(hasWebGL, [])
  useIdleReset()

  if (!webgl) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-white/80">
        Seu dispositivo não suporta gráficos 3D (WebGL). Abra em outro navegador ou aparelho.
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <SceneBoundary>
        <Suspense fallback={<Loading />}>
          <Scene />
        </Suspense>
      </SceneBoundary>
      <div className="pointer-events-none absolute inset-0">
        <TimeSlider />
        <TopControls />
        <CornerButtons />
        <StatusLegend />
        <UnitPanel />
        <Sections />
        <BottomNav />
        <BlueprintView />
        <SceneBoundary>
          <Suspense fallback={null}>
            <Apartment3DView />
          </Suspense>
        </SceneBoundary>
        <WindowViewBar />
        <FloorPlanBar />
        <FloorButtons />
      </div>
    </div>
  )
}
