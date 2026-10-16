import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Color, MathUtils } from 'three'
import type { SkyState } from '../../lib/sky'
import type { Weather } from '../../store/useStore'

/** sombra maior só em telas grandes (totem 4K); o resto usa 2048 para poupar memória de GPU */
const SHADOW_SIZE =
  typeof window !== 'undefined' && Math.max(window.screen.width, window.screen.height) * (window.devicePixelRatio || 1) >= 2400 ? 4096 : 2048

/** Luz, céu e névoa controlados pelo horário do dia. */
export function Environment({ sky, weather }: { sky: SkyState; weather: Weather }) {
  // nuvens e chuva escurecem o sol e fecham a névoa
  const sunK = weather === 'rain' ? 0.25 : weather === 'clouds' ? 0.55 : 1
  const fogColor = useMemo(() => sky.fogColor.clone().lerp(new Color('#8a929c'), weather === 'rain' ? 0.6 : weather === 'clouds' ? 0.25 : 0), [sky, weather])
  const fogFar = weather === 'rain' ? 300 : 520
  const fogNear = weather === 'rain' ? 40 : 120
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
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      <ambientLight intensity={sky.ambientIntensity} color={ambient} />
      <directionalLight
        position={[sx * 90, Math.max(sy, 0.02) * 90, sz * 90]}
        color={sky.sunColor}
        intensity={Math.max(0.08, sky.sunIntensity * sunFade * sunK)}
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

    </>
  )
}
