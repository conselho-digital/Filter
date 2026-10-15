import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ACESFilmicToneMapping, PCFShadowMap } from 'three'
import { useStore } from '../../store/useStore'
import { skyAt } from '../../lib/sky'
import { Environment } from './Environment'
import { Terrain } from './Terrain'
import { Tower } from './Tower'
import { CameraRig } from './CameraRig'
import { WindowViewRig } from './WindowViewRig'
import { UNITS } from '../../data/units'
import { MAIN_TOWER } from '../../lib/tower'

export function Scene() {
  const timeOfDay = useStore((s) => s.timeOfDay)
  const sky = useMemo(() => skyAt(timeOfDay), [timeOfDay])
  const selectUnit = useStore((s) => s.selectUnit)

  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [30, 26, 46], fov: 40, near: 0.1, far: 700 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      onPointerMissed={() => selectUnit(null)}
    >
      <Environment sky={sky} />
      <Terrain night={sky.night} />
      <Tower {...MAIN_TOWER} night={sky.night} units={UNITS} podium />
      <CameraRig />
      <WindowViewRig />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={[0, 8, 0]}
        minDistance={16}
        maxDistance={150}
        enablePan={false}
        maxPolarAngle={Math.PI / 2 - 0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </Canvas>
  )
}
