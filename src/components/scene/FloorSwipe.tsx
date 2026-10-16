import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { BASE_HEIGHT, FLOOR_HEIGHT, MAIN_TOWER } from '../../lib/tower'
import { useStore } from '../../store/useStore'

/** deslocamento vertical (px) dos três dedos para subir ou descer um andar */
const STEP_PX = 36

/**
 * Três dedos para cima/baixo: sobe ou desce a câmera um andar por vez (na planta em corte, troca o andar).
 * No teclado, Page Up / Page Down fazem o mesmo.
 */
export function FloorSwipe() {
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const el = gl.domElement
    let startY: number | null = null

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

    const avgY = (t: TouchList) => {
      let y = 0
      for (let i = 0; i < t.length; i++) y += t[i].clientY
      return y / t.length
    }
    const onStart = (e: TouchEvent) => {
      startY = e.touches.length === 3 ? avgY(e.touches) : null
    }
    const onMove = (e: TouchEvent) => {
      if (startY === null || e.touches.length !== 3) return
      e.preventDefault()
      const y = avgY(e.touches)
      // dedos para cima (y diminui) = sobe um andar
      while (Math.abs(startY - y) >= STEP_PX) {
        const dir = startY - y > 0 ? 1 : -1
        step(dir)
        startY -= dir * STEP_PX
      }
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 3) startY = null
    }
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'PageUp') step(1)
      else if (e.key === 'PageDown') step(-1)
      else return
      e.preventDefault()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl, controls, camera, invalidate])

  return null
}
