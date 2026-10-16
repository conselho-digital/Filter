import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useStore } from '../../store/useStore'

/**
 * Arrastar para girar só vale quando o toque/clique começa fora do prédio: sobre a torre o arrasto não gira
 * a câmera (o toque continua escolhendo o apartamento, e a pinça continua dando zoom).
 */
export function DragGuard() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null

  useEffect(() => {
    if (!controls) return
    const el = gl.domElement
    const ray = new Raycaster()
    const ndc = new Vector2()
    const active = new Set<number>()
    let guarded = false

    const onDown = (e: PointerEvent) => {
      active.add(e.pointerId)
      // só o primeiro dedo/clique decide
      if (active.size !== 1) return
      // na varanda e na planta em corte o arrasto continua livre (olhar em volta / ver o pavimento)
      const mode = useStore.getState().viewMode
      if (mode === 'windowView' || mode === 'floorplan') return
      const tower = scene.getObjectByName('tower')
      if (!tower) return
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      guarded = ray.intersectObject(tower, true).length > 0
      if (guarded) controls.enableRotate = false
    }
    const onUp = (e: PointerEvent) => {
      active.delete(e.pointerId)
      if (active.size === 0 && guarded) {
        controls.enableRotate = true
        guarded = false
      }
    }

    el.addEventListener('pointerdown', onDown, true)
    el.addEventListener('pointerup', onUp, true)
    el.addEventListener('pointercancel', onUp, true)
    return () => {
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('pointerup', onUp, true)
      el.removeEventListener('pointercancel', onUp, true)
      controls.enableRotate = true
    }
  }, [gl, scene, camera, controls])

  return null
}
