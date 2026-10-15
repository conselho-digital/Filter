import { useMemo } from 'react'
import { BlueprintView } from './components/blueprint/BlueprintView'
import { Scene } from './components/scene/Scene'
import { StatusLegend } from './components/ui/StatusLegend'
import { TimeSlider } from './components/ui/TimeSlider'
import { UnitPanel } from './components/ui/UnitPanel'

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

  if (!webgl) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-white/80">
        Seu dispositivo não suporta gráficos 3D (WebGL). Abra em outro navegador ou aparelho.
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Scene />
      <div className="pointer-events-none absolute inset-0">
        <TimeSlider />
        <StatusLegend />
        <UnitPanel />
        <BlueprintView />
      </div>
    </div>
  )
}
