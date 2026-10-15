import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { UNITS_BY_ID } from '../../data/units'
import { cameraState } from '../../lib/cameraState'
import { unitWorldPosition } from '../../lib/tower'
import { useStore } from '../../store/useStore'

const AERIAL_TARGET = new Vector3(0, 8, 0)
const AERIAL_DISTANCE = 66
const UNIT_DISTANCE = 16
const DURATION = 1.2

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

interface Flight {
  t: number
  fromTarget: Vector3
  toTarget: Vector3
  fromDistance: number
  toDistance: number
}

/** Voo de câmera suave (~1,2 s) entre a vista aérea e a unidade selecionada. */
export function CameraRig() {
  const selectedId = useStore((s) => s.selectedUnitId)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const flight = useRef<Flight | null>(null)
  const prevSelected = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (!controls) return
    // primeira leitura só registra; depois só voa quando a seleção realmente muda
    if (prevSelected.current === undefined) {
      prevSelected.current = selectedId
      return
    }
    if (prevSelected.current === selectedId) return
    prevSelected.current = selectedId
    // a vista da varanda (ou a volta dela) é a dona da câmera
    if (cameraState.windowView) return
    const toTarget = selectedId
      ? new Vector3(...unitWorldPosition(UNITS_BY_ID.get(selectedId)!))
      : AERIAL_TARGET.clone()
    flight.current = {
      t: 0,
      fromTarget: controls.target.clone(),
      toTarget,
      fromDistance: camera.position.distanceTo(controls.target),
      toDistance: selectedId ? UNIT_DISTANCE : AERIAL_DISTANCE,
    }
    invalidate()
  }, [selectedId, controls, camera, invalidate])

  // o usuário assumiu o controle: cancela o voo
  useEffect(() => {
    if (!controls) return
    const cancel = () => {
      flight.current = null
    }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useFrame((_, delta) => {
    if (cameraState.windowView) flight.current = null
    const f = flight.current
    if (!f || !controls) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    f.t = reduced ? 1 : Math.min(1, f.t + delta / DURATION)
    const k = ease(f.t)
    // mantém o azimute atual e só muda alvo e distância
    const dir = camera.position.clone().sub(controls.target).normalize()
    const target = f.fromTarget.clone().lerp(f.toTarget, k)
    const distance = f.fromDistance + (f.toDistance - f.fromDistance) * k
    controls.target.copy(target)
    camera.position.copy(target).addScaledVector(dir, distance)
    controls.update()
    if (f.t >= 1) flight.current = null
    else invalidate()
  })

  return null
}
