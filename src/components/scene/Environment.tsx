import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Fog } from 'three'
import type { SkyState } from '../../lib/sky'

/** Luz, céu, névoa, terreno e mar controlados pelo horário do dia. */
export function Environment({ sky }: { sky: SkyState }) {
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    scene.background = sky.skyColor.clone()
    scene.fog = new Fog(sky.fogColor.clone(), 40, 140)
  }, [scene, sky])

  const [sx, sy, sz] = sky.sunDir
  const sunUp = sy > -0.05

  return (
    <>
      <ambientLight intensity={sky.ambientIntensity} color={sky.skyColor} />
      <directionalLight
        position={[sx * 50, Math.max(sy, 0.02) * 50, sz * 50]}
        color={sky.sunColor}
        intensity={sunUp ? sky.sunIntensity : 0.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
      />
      {sky.night > 0.6 && <Stars radius={150} depth={40} count={2500} factor={4} fade />}

      {/* terreno */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 10]} receiveShadow>
        <planeGeometry args={[120, 70]} />
        <meshStandardMaterial color="#8a9a78" roughness={1} emissive="#8a9a78" emissiveIntensity={sky.night * 0.1} />
      </mesh>
      {/* mar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -85]}>
        <planeGeometry args={[400, 120]} />
        <meshStandardMaterial color={sky.seaColor} roughness={0.15} metalness={0.4} />
      </mesh>
    </>
  )
}
