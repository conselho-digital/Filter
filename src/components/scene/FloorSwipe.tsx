import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { BASE_HEIGHT, FLOOR_HEIGHT, MAIN_TOWER } from '../../lib/tower'
import { floorStep } from '../../lib/floorStep'
import { useStore } from '../../store/useStore'

/** deslocamento vertical (px) dos três dedos para subir ou descer um andar */
const STEP_PX = 36

/**
 * Três dedos para cima/baixo: sobe ou desce a câmera um andar por vez (na planta em corte, troca o andar).
 * No teclado, Page Up / Page Down fazem o mesmo; os botões de andar da interface usam `floorStep`.
 */
export function FloorSwipe() {
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const el = gl.domElement
    const step = (dir: 1 | -1) => {
      const st = useStore.getState()
      if (st.viewMode === 'windowView' || st.viewMode === 'plan3d' || st.viewMode === 'blueprint') return
      if (st.viewMode === 'floorplan') {
        st.stepFloor(dir)
        return
      }
      if (!controls) return
      if (st.touring) st.setTouring(false)
      const minY = BASE_HEIGHT + FLOOR_HEIGHT / 2
      const maxY = BASE_HEIGHT + MAIN_TOWER.floors * FLOOR_HEIGHT
      const ny = Math.min(maxY, Math.max(minY, controls.target.y + dir * FLOOR_HEIGHT))
      const dy = ny - controls.target.y
      if (!dy) return
      controls.target.y += dy
      camera.position.y += dy
      controls.update()
      invalidate()
    }

    // três dedos: acompanhamos os toques por pointer events na fase de captura (antes do OrbitControls)
    const touches = new Map<number, number>()
    let startY: number | null = null
    let paused = false
    const avgY = () => {
      let y = 0
      touches.forEach((v) => (y += v))
      return y / touches.size
    }
    const release = () => {
      startY = null
      if (paused && controls) controls.enabled = true
      paused = false
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.set(e.pointerId, e.clientY)
      if (touches.size === 3) {
        startY = avgY()
        // com três dedos a órbita e a pinça ficam paradas
        if (controls) {
          controls.enabled = false
          paused = true
        }
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return
      touches.set(e.pointerId, e.clientY)
      if (startY === null || touches.size !== 3) return
      e.preventDefault()
      e.stopPropagation()
      const y = avgY()
      // dedos para cima (y diminui) = sobe um andar
      while (Math.abs(startY - y) >= STEP_PX) {
        const dir = startY - y > 0 ? 1 : -1
        step(dir)
        startY -= dir * STEP_PX
      }
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.delete(e.pointerId)
      if (touches.size < 3) release()
    }
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'PageUp') step(1)
      else if (e.key === 'PageDown') step(-1)
      else return
      e.preventDefault()
    }

    floorStep.fn = step
    el.addEventListener('pointerdown', onDown, true)
    el.addEventListener('pointermove', onMove, true)
    el.addEventListener('pointerup', onUp, true)
    el.addEventListener('pointercancel', onUp, true)
    window.addEventListener('keydown', onKey)
    return () => {
      floorStep.fn = null
      release()
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('pointermove', onMove, true)
      el.removeEventListener('pointerup', onUp, true)
      el.removeEventListener('pointercancel', onUp, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl, controls, camera, invalidate])

  return null
}
