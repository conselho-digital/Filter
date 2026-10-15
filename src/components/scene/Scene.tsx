import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ACESFilmicToneMapping, PCFShadowMap } from 'three'
import { useStore } from '../../store/useStore'
import { skyAt } from '../../lib/sky'
import { Environment } from './Environment'
import { City } from './City'
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
      camera={{ position: [26, 16, 30], fov: 40, near: 0.1, far: 500 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      onPointerMissed={() => selectUnit(null)}
    >
      <Environment sky={sky} />
      <City night={sky.night} />
      <Tower {...MAIN_TOWER} night={sky.night} units={UNITS} podium />
      <Tower position={[-9, 0, -4]} floors={17} seed={3} night={sky.night} />
      <Tower position={[9, 0, -5]} floors={19} seed={5} night={sky.night} />
      <CameraRig />
      <WindowViewRig />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={[0, 7, 0]}
        minDistance={16}
        maxDistance={70}
        enablePan={false}
        maxPolarAngle={Math.PI / 2 - 0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </Canvas>
  )
}
