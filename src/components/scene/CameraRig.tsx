import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { UNITS_BY_ID } from '../../data/units'
import { cameraState } from '../../lib/cameraState'
import { MAIN_TOWER, towerLevels, unitWorldPosition } from '../../lib/tower'
import { useStore } from '../../store/useStore'
import { AERIAL_DISTANCE, AERIAL_TARGET } from '../../lib/cameraConsts'

const UNIT_DISTANCE = 16
/** planta em corte: vista de cima e de lado do pavimento */
const PLAN_DISTANCE = 15
const PLAN_ELEVATION = (58 * Math.PI) / 180
const UNIT_ELEVATION = (18 * Math.PI) / 180
const DURATION = 1.2

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

interface Flight {
  t: number
  fromTarget: Vector3
  toTarget: Vector3
  fromDistance: number
  toDistance: number
  /** inclinação final da câmera (rad acima do horizonte); sem ela mantém a atual */
  toElevation?: number
}

/** Voo de câmera suave (~1,2 s) entre a vista aérea e a unidade selecionada. */
export function CameraRig() {
  const selectedId = useStore((s) => s.selectedUnitId)
  const isPlan = useStore((s) => s.viewMode === 'floorplan')
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const flight = useRef<Flight | null>(null)
  const prevSelected = useRef<string | null | undefined>(undefined)
  const prevPlan = useRef(false)

  useEffect(() => {
    if (!controls) return
    // primeira leitura só registra; depois só voa quando a seleção realmente muda
    if (prevSelected.current === undefined) {
      prevSelected.current = selectedId
      return
    }
    const planChanged = prevPlan.current !== isPlan
    if (prevSelected.current === selectedId && !planChanged) return
    prevSelected.current = selectedId
    prevPlan.current = isPlan
    // a vista da varanda (ou a volta dela) é a dona da câmera
    if (cameraState.windowView) return
    const unit = selectedId ? UNITS_BY_ID.get(selectedId) : undefined
    let toTarget: Vector3
    if (unit && isPlan) {
      // centro do pavimento em corte
      const y = towerLevels(MAIN_TOWER.floors, MAIN_TOWER.seed)[unit.floor - 1].y
      toTarget = new Vector3(MAIN_TOWER.position[0], MAIN_TOWER.position[1] + y, MAIN_TOWER.position[2])
    } else {
      toTarget = unit ? new Vector3(...unitWorldPosition(unit)) : AERIAL_TARGET.clone()
    }
    flight.current = {
      t: 0,
      fromTarget: controls.target.clone(),
      toTarget,
      fromDistance: camera.position.distanceTo(controls.target),
      toDistance: unit ? (isPlan ? PLAN_DISTANCE : UNIT_DISTANCE) : AERIAL_DISTANCE,
      toElevation: unit && isPlan ? PLAN_ELEVATION : planChanged && unit ? UNIT_ELEVATION : undefined,
    }
    invalidate()
  }, [selectedId, isPlan, controls, camera, invalidate])

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
    if (f.toElevation !== undefined) {
      // inclina a câmera aos poucos até a elevação pedida, sem mudar o azimute
      const flat = Math.hypot(dir.x, dir.z) || 1
      const el = Math.asin(Math.max(-1, Math.min(1, dir.y)))
      const nel = el + (f.toElevation - el) * Math.min(1, k * 1.2)
      dir.set((dir.x / flat) * Math.cos(nel), Math.sin(nel), (dir.z / flat) * Math.cos(nel))
    }
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
