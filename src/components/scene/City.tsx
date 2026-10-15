import { useMemo } from 'react'
import { createRng } from '../../lib/random'

interface CityProps {
  night: number
}

/** Edifícios vizinhos em massa simplificada, piscina e árvores (determinísticos). */
export function City({ night }: CityProps) {
  const buildings = useMemo(() => {
    const rand = createRng(7)
    const out: { x: number; z: number; w: number; d: number; h: number }[] = []
    for (let i = 0; i < 70; i++) {
      const x = (rand() - 0.5) * 70
      const z = -14 + rand() * 48
      if (Math.abs(x) < 10 && z < 18) continue // área livre do empreendimento
      out.push({ x, z, w: 1.6 + rand() * 2.4, d: 1.6 + rand() * 2.4, h: 1.5 + rand() * 6 })
    }
    return out
  }, [])

  const trees = useMemo(() => {
    const rand = createRng(21)
    return Array.from({ length: 60 }, () => ({
      x: (rand() - 0.5) * 24,
      z: 3 + rand() * 9,
      s: 0.5 + rand() * 0.6,
    }))
  }, [])

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color="#9fb4cc"
            roughness={0.7}
            emissive="#ffcf8a"
            emissiveIntensity={night * 0.35}
          />
        </mesh>
      ))}

      {/* piscina */}
      <mesh position={[0, 0.03, 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 2.4]} />
        <meshStandardMaterial
          color="#4cc9e0"
          roughness={0.1}
          metalness={0.2}
          emissive="#4cc9e0"
          emissiveIntensity={night * 0.9}
        />
      </mesh>

      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 0.5, 6]} />
            <meshStandardMaterial color="#5b4636" />
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow>
            <icosahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color="#3f7d4a" roughness={0.9} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}
