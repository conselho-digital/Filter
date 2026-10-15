import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Euler, MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { UNITS_BY_ID } from '../../data/units'
import { unitWindowPose } from '../../lib/tower'
import { useStore } from '../../store/useStore'

const WINDOW_FOV = 70
const WINDOW_NEAR = 0.02
const DURATION = 1.2
const MAX_YAW = 1.3 // rad de giro para cada lado, a partir da direção da vista
const MIN_PITCH = -0.5
const MAX_PITCH = 0.6
const DRAG_SPEED = 0.004

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const orient = (yaw: number, pitch: number) => new Quaternion().setFromEuler(new Euler(pitch, yaw, 0, 'YXZ'))

interface Flight {
  t: number
  fromPos: Vector3
  toPos: Vector3
  fromQuat: Quaternion
  toQuat: Quaternion
  fromFov: number
  toFov: number
  fromNear: number
  toNear: number
  /** quando termina uma volta à maquete, devolve o controle à órbita */
  restore: boolean
}

interface Saved {
  pos: Vector3
  quat: Quaternion
  target: Vector3
  fov: number
  near: number
}

/**
 * Vista da varanda: voo de câmera até os olhos da unidade, olhar livre por arrasto
 * (limitado) e volta à maquete exatamente de onde o usuário saiu.
 */
export function WindowViewRig() {
  const viewMode = useStore((s) => s.viewMode)
  const selectedId = useStore((s) => s.selectedUnitId)
  const preset = useStore((s) => s.windowViewPreset)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)

  const flight = useRef<Flight | null>(null)
  const saved = useRef<Saved | null>(null)
  const inWindow = useRef(false)
  const look = useRef({ baseYaw: 0, yaw: 0, pitch: 0 })
  const dragging = useRef<number | null>(null)

  const wantWindow = viewMode === 'windowView' && !!selectedId

  useEffect(() => {
    if (!controls) return
    const unit = selectedId ? UNITS_BY_ID.get(selectedId) : undefined

    if (wantWindow && unit) {
      const pose = unitWindowPose(unit, preset)
      const toPos = new Vector3(...pose.position)
      look.current = { baseYaw: pose.yaw, yaw: pose.yaw, pitch: 0 }
      if (!inWindow.current) {
        // entrando: guarda a pose da órbita e assume a câmera
        saved.current = {
          pos: camera.position.clone(),
          quat: camera.quaternion.clone(),
          target: controls.target.clone(),
          fov: camera.fov,
          near: camera.near,
        }
        controls.enabled = false
        inWindow.current = true
      }
      flight.current = {
        t: 0,
        fromPos: camera.position.clone(),
        toPos,
        fromQuat: camera.quaternion.clone(),
        toQuat: orient(pose.yaw, 0),
        fromFov: camera.fov,
        toFov: WINDOW_FOV,
        fromNear: camera.near,
        toNear: WINDOW_NEAR,
        restore: false,
      }
      invalidate()
    } else if (inWindow.current && saved.current) {
      // saindo: volta à pose guardada e devolve o controle à órbita
      const s = saved.current
      flight.current = {
        t: 0,
        fromPos: camera.position.clone(),
        toPos: s.pos.clone(),
        fromQuat: camera.quaternion.clone(),
        toQuat: s.quat.clone(),
        fromFov: camera.fov,
        toFov: s.fov,
        fromNear: camera.near,
        toNear: s.near,
        restore: true,
      }
      inWindow.current = false
      invalidate()
    }
  }, [wantWindow, selectedId, preset, controls, camera, invalidate])

  // olhar livre por arrasto (mouse e toque), só dentro da vista da varanda
  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      if (!inWindow.current || flight.current) return
      dragging.current = e.pointerId
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (dragging.current !== e.pointerId || !inWindow.current) return
      const l = look.current
      l.yaw = MathUtils.clamp(l.yaw + e.movementX * DRAG_SPEED, l.baseYaw - MAX_YAW, l.baseYaw + MAX_YAW)
      l.pitch = MathUtils.clamp(l.pitch + e.movementY * DRAG_SPEED, MIN_PITCH, MAX_PITCH)
      camera.quaternion.copy(orient(l.yaw, l.pitch))
      invalidate()
    }
    const up = (e: PointerEvent) => {
      if (dragging.current === e.pointerId) dragging.current = null
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl, camera, invalidate])

  useFrame((_, delta) => {
    const f = flight.current
    if (!f) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    f.t = reduced ? 1 : Math.min(1, f.t + delta / DURATION)
    const k = ease(f.t)
    camera.position.lerpVectors(f.fromPos, f.toPos, k)
    camera.quaternion.slerpQuaternions(f.fromQuat, f.toQuat, k)
    camera.fov = MathUtils.lerp(f.fromFov, f.toFov, k)
    camera.near = MathUtils.lerp(f.fromNear, f.toNear, k)
    camera.updateProjectionMatrix()
    if (f.t >= 1) {
      flight.current = null
      if (f.restore && controls && saved.current) {
        controls.target.copy(saved.current.target)
        controls.enabled = true
        controls.update()
        saved.current = null
      }
    } else {
      invalidate()
    }
  })

  return null
}
