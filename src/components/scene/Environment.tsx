import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { MathUtils } from 'three'
import type { SkyState } from '../../lib/sky'

/** Luz, céu, névoa, terreno e mar controlados pelo horário do dia. */
export function Environment({ sky }: { sky: SkyState }) {
  const invalidate = useThree((s) => s.invalidate)

  // render sob demanda: redesenha quando o horário muda
  useEffect(() => {
    invalidate()
  }, [sky, invalidate])

  const [sx, sy, sz] = sky.sunDir
  // intensidade cai suavemente a zero conforme o sol desce do horizonte
  const sunFade = MathUtils.smoothstep(sy, -0.12, 0.08)

  return (
    <>
      <color attach="background" args={[sky.skyColor]} />
      <fog attach="fog" args={[sky.fogColor, 40, 160]} />
      <ambientLight intensity={sky.ambientIntensity} color={sky.skyColor} />
      <directionalLight
        position={[sx * 50, Math.max(sy, 0.02) * 50, sz * 50]}
        color={sky.sunColor}
        intensity={Math.max(0.08, sky.sunIntensity * sunFade)}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
      />
      {sky.night > 0.5 && <Stars radius={150} depth={40} count={2500} factor={4} fade />}

      {/* terreno */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 220]} />
        <meshStandardMaterial color="#8a9a78" roughness={1} emissive="#8a9a78" emissiveIntensity={sky.night * 0.1} />
      </mesh>
      {/* mar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -170]}>
        <planeGeometry args={[800, 120]} />
        <meshStandardMaterial color={sky.seaColor} roughness={0.15} metalness={0.4} />
      </mesh>
    </>
  )
}
