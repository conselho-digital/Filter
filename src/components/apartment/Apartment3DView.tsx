import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { ACESFilmicToneMapping, CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Tags, X, Maximize2 } from 'lucide-react'
import { UNITS_BY_ID } from '../../data/units'
import { buildApartment3D, type Prim } from '../../lib/apartment3d'
import { formatArea, typology } from '../../lib/status'
import { useStore } from '../../store/useStore'

/** Textura de tábuas de madeira desenhada em canvas (sem arquivo externo, compatível com a CSP). */
function usePlanks(base: string, line: string) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    g.fillStyle = base
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `rgba(0,0,0,${0.03 + (i % 3) * 0.015})`
      g.fillRect(0, i * 32, 256, 32)
      g.fillStyle = line
      g.fillRect(0, i * 32, 256, 2)
      const off = (i * 83) % 256
      g.fillRect(off, i * 32, 2, 32)
    }
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.colorSpace = SRGBColorSpace
    return t
  }, [base, line])
}

function PrimMesh({ p }: { p: Prim }) {
  const color = useMemo(() => new Color(p.color), [p.color])
  const transparent = p.opacity !== undefined
  return (
    <mesh
      position={[p.x, p.y, p.z]}
      rotation={[p.rx ?? 0, p.ry ?? 0, p.rz ?? 0]}
      scale={[p.sx, p.sy, p.sz]}
      castShadow={!p.noShadow}
      receiveShadow
    >
      {p.shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {p.shape === 'cyl' && <cylinderGeometry args={[0.5, 0.5, 1, 20]} />}
      {p.shape === 'sph' && <sphereGeometry args={[0.5, 16, 12]} />}
      <meshStandardMaterial
        color={color}
        roughness={p.rough ?? 0.78}
        metalness={p.metal ?? 0.02}
        transparent={transparent}
        opacity={p.opacity ?? 1}
        depthWrite={!transparent}
      />
    </mesh>
  )
}

/** Câmera isométrica recortada: olha da frente (varanda) e de um dos lados, como na referência. */
function CameraSetup({ center, size }: { center: [number, number, number]; size: number }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  useEffect(() => {
    const dist = size * 1.85
    const az = -0.78
    const el = 0.58
    camera.position.set(
      center[0] + Math.sin(az) * dist * Math.cos(el),
      center[1] + dist * Math.sin(el),
      center[2] - Math.cos(az) * dist * Math.cos(el),
    )
    camera.lookAt(center[0], center[1], center[2])
    controls?.target.set(center[0], center[1], center[2])
    controls?.update()
  }, [camera, controls, center, size])
  return null
}

function Scene({ unitId, labels }: { unitId: string; labels: boolean }) {
  const unit = UNITS_BY_ID.get(unitId)!
  const apt = useMemo(() => buildApartment3D(unit), [unit])
  const wood = usePlanks('#c8955c', 'rgba(70,40,15,0.35)')
  const deck = usePlanks('#b5834f', 'rgba(60,35,12,0.4)')
  const size = Math.max(apt.plan.width, apt.plan.depth)

  // o piso de madeira recebe a textura de tábuas (as peças de piso têm altura de 0,04 m)
  const prims = useMemo(
    () => apt.prims.map((p) => ({ ...p, floor: p.sy === 0.04 && p.y === 0 })),
    [apt],
  )

  return (
    <>
      <color attach="background" args={['#eef2f6']} />
      <fog attach="fog" args={['#eef2f6', size * 2.2, size * 5]} />
      <hemisphereLight args={['#ffffff', '#d9cdb8', 0.9]} />
      <directionalLight
        position={[apt.center[0] - size * 0.6, size * 1.3, apt.center[2] - size * 0.9]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-far={size * 5}
        shadow-bias={-0.0004}
      />
      <CameraSetup center={apt.center} size={size} />

      {/* mar à frente da varanda */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[apt.center[0], -0.6, -size * 1.4]}>
        <planeGeometry args={[size * 8, size * 3]} />
        <meshStandardMaterial color="#4f9fdb" roughness={0.15} metalness={0.2} />
      </mesh>

      {prims.map((p, i) => {
        if (p.floor && (p.color === '#c8955c' || p.color === '#b5834f')) {
          // pisos de madeira e deck com textura
          const tex = p.color === '#c8955c' ? wood : deck
          return (
            <mesh key={i} position={[p.x, p.y, p.z]} scale={[p.sx, p.sy, p.sz]} receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#ffffff" map={tex} roughness={0.7} />
            </mesh>
          )
        }
        return <PrimMesh key={i} p={p} />
      })}

      {labels &&
        apt.labels.map((l) => (
          <Html key={l.name} position={[l.x, 0.2, l.z]} center distanceFactor={size * 0.9} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div className="whitespace-nowrap rounded-lg bg-black/55 px-2.5 py-1 text-center text-xs font-medium text-white backdrop-blur">
              {l.name}
              <div className="text-[10px] font-normal text-white/75">{l.size}</div>
            </div>
          </Html>
        ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={size * 0.8}
        maxDistance={size * 3}
        maxPolarAngle={Math.PI / 2 - 0.12}
        minPolarAngle={0.2}
      />
    </>
  )
}

/** Apartamento mobiliado em 3D (recorte isométrico), gerado a partir da planta da unidade. */
export function Apartment3DView() {
  const viewMode = useStore((s) => s.viewMode)
  useStore((s) => s.areaUnit) // refaz os textos ao trocar m²/ft²
  const selectedId = useStore((s) => s.selectedUnitId)
  const closePlan3d = useStore((s) => s.closePlan3d)
  const unit = selectedId ? UNITS_BY_ID.get(selectedId) : undefined
  const open = viewMode === 'plan3d' && !!unit
  const [labels, setLabels] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => opener?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useStore.getState().section === null) closePlan3d()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePlan3d])

  if (!open || !unit) return null

  const btn =
    'flex h-12 w-12 items-center justify-center rounded-full bg-[#0a0f1d] text-white shadow-md transition-colors hover:bg-[#1f2a44] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={`Apartamento ${unit.id} em 3D`}
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col bg-[#eef2f6] text-[#0a0f1d] md:right-[380px]"
    >
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#0a0f1d]/50">Pavimento {unit.floor} · mobiliado em 3D</p>
          <h2 className="mt-1 text-2xl font-light uppercase tracking-[0.15em]">
            {typology(unit.bedrooms)} · Apartamento {unit.id}
          </h2>
          <p className="mt-1 text-sm text-[#0a0f1d]/60">
            área total {formatArea(unit.area)} · {unit.orientation}
          </p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" aria-label="Mostrar ou ocultar os nomes dos cômodos" aria-pressed={labels} className={`${btn} ${labels ? 'bg-brand' : ''}`} onClick={() => setLabels((v) => !v)}>
            <Tags size={20} />
          </button>
          <button type="button" aria-label="Recentrar a câmera" className={btn} onClick={() => setResetKey((k) => k + 1)}>
            <Maximize2 size={20} />
          </button>
          <button ref={closeRef} type="button" aria-label="Voltar à maquete" className={btn} onClick={closePlan3d}>
            <X size={22} />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Canvas
          key={`${unit.id}-${resetKey}`}
          shadows
          dpr={[1, 2]}
          camera={{ fov: 32, near: 0.1, far: 400, position: [-8, 9, -10] }}
          gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, preserveDrawingBuffer: true }}
        >
          <Suspense fallback={null}>
            <Scene unitId={unit.id} labels={labels} />
          </Suspense>
        </Canvas>
      </div>
    </section>
  )
}
