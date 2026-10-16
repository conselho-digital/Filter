import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { BASE_HEIGHT, FLOOR_HEIGHT, MAIN_TOWER } from '../../lib/tower'
import { floorStep } from '../../lib/floorStep'
import { useStore } from '../../store/useStore'

/** unidades de cena por pixel de rolagem (toque e trackpad/roda) */
const TOUCH_K = 0.015
const WHEEL_K = 0.01
/** pixels acumulados para trocar de andar na planta em corte */
const PLAN_STEP_PX = 50

/**
 * Subir e descer a câmera pelos andares: três dedos arrastados para cima/baixo no celular, ou Ctrl + roda do
 * mouse no computador. A roda sozinha e a pinça de dois dedos continuam dando zoom.
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

    // --- três dedos no toque: arrastar para cima/baixo rola os andares (dois dedos continuam sendo pinça)
    const touches = new Map<number, number>()
    let scrolling = false
    let lastAvg = 0
    const avgY = () => {
      let y = 0
      touches.forEach((v) => (y += v))
      return y / touches.size
    }
    const endScroll = () => {
      if (scrolling && controls) controls.enabled = true
      scrolling = false
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.set(e.pointerId, e.clientY)
      if (touches.size === 3) {
        // a órbita e a pinça param enquanto há três dedos na tela
        scrolling = true
        lastAvg = avgY()
        if (controls) controls.enabled = false
      } else if (touches.size > 3) endScroll()
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return
      touches.set(e.pointerId, e.clientY)
      if (!scrolling || touches.size !== 3) return
      e.stopPropagation()
      e.preventDefault()
      const avg = avgY()
      scrollPx(avg - lastAvg, TOUCH_K)
      lastAvg = avg
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.delete(e.pointerId)
      if (touches.size < 3) endScroll()
    }

    // --- computador: Ctrl + roda (ou pinça do trackpad, que chega como Ctrl + roda) sobe e desce a câmera
    // roda do mouse sozinha = zoom (fica com o OrbitControls); Ctrl + roda = sobe/desce a câmera
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || blocked()) return
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
    // botão do meio (roda) segurado e arrastado: sobe/desce a câmera (rolar a roda continua dando zoom)
    let midY: number | null = null
    const onMidDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 1) return
      e.preventDefault() // evita a rolagem automática do navegador
      midY = e.clientY
      el.setPointerCapture?.(e.pointerId)
    }
    const onMidMove = (e: PointerEvent) => {
      if (midY === null || e.pointerType !== 'mouse') return
      const dy = e.clientY - midY
      midY = e.clientY
      // arrastar para cima = câmera sobe
      scrollPx(-dy * 1.5, WHEEL_K)
    }
    const onMidUp = (e: PointerEvent) => {
      if (e.button === 1 || e.buttons === 0) midY = null
    }
    el.addEventListener('pointerdown', onMidDown, true)
    el.addEventListener('pointermove', onMidMove, true)
    el.addEventListener('pointerup', onMidUp, true)
    el.addEventListener('pointerdown', onDown, true)
    el.addEventListener('pointermove', onMove, true)
    el.addEventListener('pointerup', onUp, true)
    el.addEventListener('pointercancel', onUp, true)
    el.addEventListener('wheel', onWheel, { capture: true, passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      floorStep.fn = null
      endScroll()
      el.removeEventListener('pointerdown', onMidDown, true)
      el.removeEventListener('pointermove', onMidMove, true)
      el.removeEventListener('pointerup', onMidUp, true)
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
