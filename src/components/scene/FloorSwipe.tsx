import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { BASE_HEIGHT, FLOOR_HEIGHT, MAIN_TOWER } from '../../lib/tower'
import { floorStep } from '../../lib/floorStep'
import { useStore } from '../../store/useStore'

/** unidades de cena por pixel de rolagem (toque e trackpad/roda) */
const TOUCH_K = 0.015
const WHEEL_K = 0.01
/** movimento mínimo (px) para decidir entre rolar e pinçar com dois dedos */
const DECIDE_PX = 10
/** pixels acumulados para trocar de andar na planta em corte */
const PLAN_STEP_PX = 50

/**
 * Rolagem vertical como numa página: dois dedos arrastados juntos para cima/baixo no celular, ou dois dedos
 * no trackpad (roda do mouse), sobem e descem a câmera pelos andares (o conteúdo acompanha os dedos).
 * Pinçar (dedos se afastando/aproximando, ou Ctrl + roda / pinça no trackpad) continua dando zoom.
 * Na planta em corte, a rolagem troca de andar. Page Up / Page Down e os botões ▲▼ (`floorStep`) sobem um andar.
 */
export function FloorSwipe() {
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const el = gl.domElement
    const blocked = () => {
      const m = useStore.getState().viewMode
      return m === 'windowView' || m === 'plan3d' || m === 'blueprint'
    }

    /** desloca câmera e alvo na vertical, sem passar do térreo nem da cobertura */
    const moveBy = (dy: number) => {
      if (!controls) return
      const st = useStore.getState()
      if (st.touring) st.setTouring(false)
      const minY = BASE_HEIGHT + FLOOR_HEIGHT / 2
      const maxY = BASE_HEIGHT + MAIN_TOWER.floors * FLOOR_HEIGHT
      const ny = Math.min(maxY, Math.max(minY, controls.target.y + dy))
      const d = ny - controls.target.y
      if (!d) return
      controls.target.y += d
      camera.position.y += d
      controls.update()
      invalidate()
    }

    const step = (dir: 1 | -1) => {
      if (blocked()) return
      const st = useStore.getState()
      if (st.viewMode === 'floorplan') st.stepFloor(dir)
      else moveBy(dir * FLOOR_HEIGHT)
    }

    // rolagem em pixels: dedos/conteúdo para baixo = câmera sobe (positivo)
    let planAcc = 0
    const scrollPx = (px: number, k: number) => {
      if (blocked()) return
      if (useStore.getState().viewMode === 'floorplan') {
        planAcc += px
        while (Math.abs(planAcc) >= PLAN_STEP_PX) {
          const dir = planAcc > 0 ? 1 : -1
          useStore.getState().stepFloor(dir)
          planAcc -= dir * PLAN_STEP_PX
        }
        return
      }
      moveBy(px * k)
    }

    // --- dois dedos no toque: decide entre rolar (dedos juntos na vertical) e pinçar (distância muda)
    const touches = new Map<number, { x: number; y: number }>()
    let mode: 'none' | 'decide' | 'scroll' | 'pinch' = 'none'
    let startAvg = 0
    let startDist = 0
    let lastAvg = 0
    const measure = () => {
      const [a, b] = [...touches.values()]
      return { avg: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) }
    }
    const endScroll = () => {
      if (mode === 'scroll' && controls) controls.enabled = true
      mode = 'none'
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) {
        const m = measure()
        mode = 'decide'
        startAvg = lastAvg = m.avg
        startDist = m.dist
      } else if (touches.size > 2) endScroll()
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size !== 2 || mode === 'none' || mode === 'pinch') return
      const { avg, dist } = measure()
      if (mode === 'decide') {
        const dAvg = Math.abs(avg - startAvg)
        const dDist = Math.abs(dist - startDist)
        if (dAvg >= DECIDE_PX && dAvg > dDist * 1.2) {
          // rolagem: a órbita/pinça param até os dedos saírem
          mode = 'scroll'
          if (controls) controls.enabled = false
          lastAvg = avg
        } else if (dDist >= DECIDE_PX) {
          mode = 'pinch'
          return
        } else {
          // ainda indefinido: segura o evento para não dar zoom antes da decisão
          e.stopPropagation()
          return
        }
      }
      e.stopPropagation()
      e.preventDefault()
      scrollPx(avg - lastAvg, TOUCH_K)
      lastAvg = avg
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.delete(e.pointerId)
      if (touches.size < 2) endScroll()
    }

    // --- trackpad (dois dedos) e roda do mouse: rola; Ctrl + roda ou pinça do trackpad: zoom (OrbitControls)
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || blocked()) return
      e.preventDefault()
      e.stopImmediatePropagation()
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      scrollPx(-px, WHEEL_K)
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
    el.addEventListener('wheel', onWheel, { capture: true, passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      floorStep.fn = null
      endScroll()
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('pointermove', onMove, true)
      el.removeEventListener('pointerup', onUp, true)
      el.removeEventListener('pointercancel', onUp, true)
      el.removeEventListener('wheel', onWheel, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl, controls, camera, invalidate])

  return null
}
