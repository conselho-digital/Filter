import { useEffect, useMemo } from 'react'
import { AERIAL_TARGET, MOBILE_POLAR } from '../../lib/cameraConsts'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, CanvasTexture, MOUSE, PCFShadowMap, SRGBColorSpace } from 'three'
import { useStore } from '../../store/useStore'
import { skyAt } from '../../lib/sky'
import { Environment } from './Environment'
import { Terrain } from './Terrain'
import { Tower } from './Tower'
import { CameraRig } from './CameraRig'
import { WindowViewRig } from './WindowViewRig'
import { UNITS, UNITS_BY_ID } from '../../data/units'
import { FloorSwipe } from './FloorSwipe'
import { BASE_HEIGHT, FLOOR_HEIGHT, MAIN_TOWER } from '../../lib/tower'
import { CaptureBridge, Weather } from './Weather'

/** Mantém o render contínuo enquanto o tour automático gira a câmera. */
function TourDriver({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  useFrame(() => {
    if (active) invalidate()
  })
  return null
}

const AVAILABLE = UNITS.filter((u) => u.status === 'available').length

/** Etiqueta da torre sobre a coroa (letra e apartamentos disponíveis), desenhada num sprite. */
function TowerTag() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 192
    const g = c.getContext('2d')!
    g.fillStyle = 'rgba(17,24,39,0.82)'
    g.beginPath()
    g.roundRect(8, 8, 496, 176, 36)
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.35)'
    g.lineWidth = 3
    g.stroke()
    g.textAlign = 'center'
    g.fillStyle = 'rgba(255,255,255,0.75)'
    g.font = '500 34px Inter, system-ui, sans-serif'
    g.fillText('T O R R E   B', 256, 70)
    g.fillStyle = '#ffffff'
    g.font = '600 56px Inter, system-ui, sans-serif'
    g.fillText(`${AVAILABLE} disponíveis`, 256, 140)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <sprite position={[MAIN_TOWER.position[0], BASE_HEIGHT + MAIN_TOWER.floors * FLOOR_HEIGHT + 3.2, MAIN_TOWER.position[2]]} scale={[8, 3, 1]}>
      <spriteMaterial map={tex} transparent toneMapped={false} fog={false} />
    </sprite>
  )
}

export function Scene() {
  const weather = useStore((s) => s.weather)
  const quality = useStore((s) => s.quality)
  const touring = useStore((s) => s.touring)
  const setTouring = useStore((s) => s.setTouring)
  const viewMode = useStore((s) => s.viewMode)
  // celular e computador: na vista aérea e da unidade o ângulo vertical fica travado olhando para baixo
  const lockPolar = viewMode === 'aerial' || viewMode === 'tower' || viewMode === 'unit'
  const selectedId = useStore((s) => s.selectedUnitId)
  const planFloor = viewMode === 'floorplan' && selectedId ? (UNITS_BY_ID.get(selectedId)?.floor ?? null) : null
  const timeOfDay = useStore((s) => s.timeOfDay)
  const sky = useMemo(() => skyAt(timeOfDay), [timeOfDay])
  const selectUnit = useStore((s) => s.selectUnit)

  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={quality === 'low' ? 1 : [1, 2]}
      frameloop="demand"
      camera={{ position: [30, 26, 46], fov: 40, near: 0.1, far: 700 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      onPointerMissed={() => selectUnit(null)}
    >
      <Environment sky={sky} weather={weather} />
      <Weather weather={weather} night={sky.night} tint={sky.fogColor} />
      <CaptureBridge />
      <TourDriver active={touring} />
      <Terrain night={sky.night} />
      <Tower {...MAIN_TOWER} night={sky.night} units={UNITS} podium planFloor={planFloor} />
      <FloorSwipe />
      {viewMode === 'aerial' && <TowerTag />}
      <CameraRig />
      <WindowViewRig />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={[AERIAL_TARGET.x, AERIAL_TARGET.y, AERIAL_TARGET.z]}
        // zoom: mais perto na planta aberta (para ver o apartamento); afastamento máximo 1/3 do antigo (150)
        minDistance={viewMode === 'floorplan' ? 3 : 10}
        maxDistance={50}
        // só na planta aberta o botão direito move o centro da câmera (pan) para ver melhor o pavimento
        enablePan={viewMode === 'floorplan'}
        screenSpacePanning={false}
        // fora da varanda e da planta o ângulo vertical fica travado olhando para baixo (sem horizonte)
        minPolarAngle={lockPolar ? MOBILE_POLAR : 0}
        maxPolarAngle={lockPolar ? MOBILE_POLAR : Math.PI / 2 - 0.08}
        autoRotate={touring}
        autoRotateSpeed={1.4}
        onStart={() => touring && setTouring(false)}
        // botão direito: aproxima/afasta; na planta aberta, move o centro da câmera
        mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: -1 as MOUSE, RIGHT: viewMode === 'floorplan' ? MOUSE.PAN : MOUSE.DOLLY }}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </Canvas>
  )
}
