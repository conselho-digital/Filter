import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, type InstancedMesh, Object3D, type LineSegments } from 'three'
import { createRng } from '../../lib/random'
import type { Weather as WeatherKind } from '../../store/useStore'
import { capture } from '../../lib/capture'

const dummy = new Object3D()

/** Nuvens achatadas instanciadas; mais escuras e baixas na chuva. */
function Clouds({ rain, night, tint }: { rain: boolean; night: number; tint: Color }) {
  const ref = useRef<InstancedMesh>(null)
  const items = useMemo(() => {
    const rand = createRng(909)
    return Array.from({ length: 70 }, () => {
      const ang = rand() * Math.PI * 2
      const r = 40 + rand() * 260
      return { x: Math.cos(ang) * r, z: Math.sin(ang) * r, y: 62 + rand() * 40, sx: 14 + rand() * 26, sy: 4 + rand() * 4, sz: 10 + rand() * 16 }
    })
  }, [])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    items.forEach((c, i) => {
      dummy.position.set(c.x, rain ? c.y - 18 : c.y, c.z)
      dummy.scale.set(c.sx, c.sy, c.sz)
      dummy.rotation.set(0, c.x, 0)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [items, rain])
  const color = useMemo(
    () => new Color(rain ? '#8d949c' : '#ffffff').lerp(tint, 0.35).multiplyScalar(1 - night * 0.75),
    [rain, night, tint],
  )
  return (
    <instancedMesh ref={ref} args={[undefined as never, undefined as never, items.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 2]} />
      <meshStandardMaterial color={color} roughness={1} transparent opacity={rain ? 0.95 : 0.9} depthWrite={false} />
    </instancedMesh>
  )
}

/** Chuva: riscos que caem em volta da torre (só renderiza quadros contínuos enquanto chove). */
function Rain() {
  const ref = useRef<LineSegments>(null)
  const invalidate = useThree((s) => s.invalidate)
  const N = 1800
  const { geo, speeds } = useMemo(() => {
    const rand = createRng(55)
    const pos = new Float32Array(N * 6)
    const sp = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const x = (rand() - 0.5) * 140
      const y = rand() * 70
      const z = (rand() - 0.5) * 140
      pos.set([x, y, z, x - 0.05, y - 0.9, z], i * 6)
      sp[i] = 38 + rand() * 18
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    return { geo: g, speeds: sp }
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  useFrame((_, dt) => {
    const a = geo.getAttribute('position') as BufferAttribute
    const d = Math.min(dt, 0.05)
    for (let i = 0; i < N; i++) {
      const fall = speeds[i] * d
      let y = a.getY(i * 2) - fall
      if (y < 0) y += 70
      a.setY(i * 2, y)
      a.setY(i * 2 + 1, y - 0.9)
    }
    a.needsUpdate = true
    invalidate()
  })
  return (
    <lineSegments ref={ref} geometry={geo} frustumCulled={false}>
      <lineBasicMaterial color="#b9c7d8" transparent opacity={0.55} />
    </lineSegments>
  )
}

/** Clima da maquete: nuvens e chuva. */
export function Weather({ weather, night, tint }: { weather: WeatherKind; night: number; tint: Color }) {
  return (
    <>
      {weather !== 'clear' && <Clouds rain={weather === 'rain'} night={night} tint={tint} />}
      {weather === 'rain' && <Rain />}
    </>
  )
}

/** Registra a captura de tela: renderiza um quadro e devolve o PNG. */
export function CaptureBridge() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    capture.fn = () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }
    return () => {
      capture.fn = null
    }
  }, [gl, scene, camera])
  return null
}
