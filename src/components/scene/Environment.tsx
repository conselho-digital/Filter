import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Color, MathUtils } from 'three'
import type { SkyState } from '../../lib/sky'

/** sombra maior só em telas grandes (totem 4K); o resto usa 2048 para poupar memória de GPU */
const SHADOW_SIZE =
  typeof window !== 'undefined' && Math.max(window.screen.width, window.screen.height) * (window.devicePixelRatio || 1) >= 2400 ? 4096 : 2048

/** Luz, céu, névoa, terreno e mar controlados pelo horário do dia. */
export function Environment({ sky }: { sky: SkyState }) {
  const invalidate = useThree((s) => s.invalidate)

  // render sob demanda: redesenha quando o horário muda
  useEffect(() => {
    invalidate()
  }, [sky, invalidate])

  // à noite o ambiente clareia para o azul-lua, senão o concreto claro fica preto
  const ambient = useMemo(
    () => sky.skyColor.clone().lerp(new Color('#ffffff'), 0.45 * (1 - sky.night)).lerp(new Color('#9fb4d8'), sky.night * 0.65),
    [sky],
  )

  const [sx, sy, sz] = sky.sunDir
  // intensidade cai suavemente a zero conforme o sol desce do horizonte
  const sunFade = MathUtils.smoothstep(sy, -0.12, 0.08)

  return (
    <>
      <color attach="background" args={[sky.skyColor]} />
      <fog attach="fog" args={[sky.fogColor, 120, 520]} />
      <ambientLight intensity={sky.ambientIntensity} color={ambient} />
      <directionalLight
        position={[sx * 90, Math.max(sy, 0.02) * 90, sz * 90]}
        color={sky.sunColor}
        intensity={Math.max(0.08, sky.sunIntensity * sunFade)}
        castShadow
        shadow-mapSize={[SHADOW_SIZE, SHADOW_SIZE]}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
      />
      {sky.night > 0.5 && <Stars radius={260} depth={40} count={2500} factor={4} fade />}

      {/* faixa de areia entre o terreno da foto e o mar (a oeste, para -z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -97]}>
        <planeGeometry args={[700, 8]} />
        <meshStandardMaterial color="#d9c9a0" roughness={1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {/* mar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -300]}>
        <planeGeometry args={[1600, 400]} />
        <meshStandardMaterial color={sky.seaColor} roughness={0.15} metalness={0.4} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
    </>
  )
}
