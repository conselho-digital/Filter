import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'

interface TowerProps {
  position?: [number, number, number]
  floors?: number
  floorHeight?: number
  /** 0 (dia) a 1 (noite): acende as janelas */
  night: number
  seed?: number
}

/** Forma de laje com cantos muito arredondados (superelipse), no plano XY. */
function slabShape(w: number, d: number, n = 4.5, steps = 48) {
  const shape = new Shape()
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const x = Math.sign(c) * Math.abs(c) ** (2 / n) * (w / 2)
    const y = Math.sign(s) * Math.abs(s) ** (2 / n) * (d / 2)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  return shape
}

/** Torre procedural com lajes onduladas e varandas, no estilo da referência. */
export function Tower({ position = [0, 0, 0], floors = 22, floorHeight = 0.62, night, seed = 1 }: TowerProps) {
  const { slab, core } = useMemo(() => {
    const slabGeo = new ExtrudeGeometry(slabShape(5.2, 3.8), { depth: 0.12, bevelEnabled: false })
    slabGeo.rotateX(-Math.PI / 2)
    const coreGeo = new ExtrudeGeometry(slabShape(4.4, 3.1), { depth: floorHeight - 0.12, bevelEnabled: false })
    coreGeo.rotateX(-Math.PI / 2)
    return { slab: slabGeo, core: coreGeo }
  }, [floorHeight])

  useEffect(() => () => {
    slab.dispose()
    core.dispose()
  }, [slab, core])

  const levels = useMemo(
    () =>
      Array.from({ length: floors }, (_, i) => ({
        y: i * floorHeight,
        rot: Math.sin(i * 0.55 + seed) * 0.16,
        dx: Math.sin(i * 0.9 + seed * 2) * 0.22,
        dz: Math.cos(i * 0.7 + seed) * 0.18,
        scale: 1 - Math.max(0, i - floors * 0.7) * 0.012,
      })),
    [floors, floorHeight, seed],
  )

  return (
    <group position={position}>
      {levels.map((l, i) => (
        <group key={i} position={[l.dx, l.y, l.dz]} rotation={[0, l.rot, 0]} scale={[l.scale, 1, l.scale]}>
          <mesh geometry={slab} castShadow receiveShadow>
            <meshStandardMaterial color="#e8edf3" roughness={0.55} metalness={0.05} emissive="#8fa4c8" emissiveIntensity={night * 0.12} />
          </mesh>
          <mesh geometry={core} position={[0, 0.12, 0]} castShadow>
            <meshStandardMaterial
              color="#7fa6cc"
              roughness={0.25}
              metalness={0.15}
              emissive="#ffcf8a"
              emissiveIntensity={night * 0.9}
            />
          </mesh>
        </group>
      ))}
      {/* cobertura */}
      <mesh position={[0, floors * floorHeight + 0.15, 0]} castShadow>
        <boxGeometry args={[2.6, 0.3, 1.8]} />
        <meshStandardMaterial color="#cfd6de" roughness={0.6} />
      </mesh>
    </group>
  )
}
