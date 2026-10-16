import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { UNITS_BY_ID } from '../../data/units'
import { BASE_HEIGHT, CORE_DEPTH, CORE_WIDTH, FLOOR_HEIGHT, MAIN_TOWER, towerLevels } from '../../lib/tower'
import { useStore } from '../../store/useStore'

/**
 * O centro da câmera (botão direito) só se move perto da torre: na planta aberta fica preso ao retângulo
 * do pavimento e à altura do andar; fora dela, à torre com uma folga e entre o térreo e a cobertura.
 * Assim o prédio (ou o andar) nunca sai da tela.
 */
export function PanClamp() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    if (!controls) return
    const onChange = () => {
      const st = useStore.getState()
      if (st.viewMode === 'windowView') return
      const unit = st.selectedUnitId ? UNITS_BY_ID.get(st.selectedUnitId) : undefined
      const plan = st.viewMode === 'floorplan' && unit
      const [px, py, pz] = MAIN_TOWER.position
      // retângulo da torre no mundo (girada); fora da planta damos uma folga para ver o entorno próximo
      const c = Math.cos(MAIN_TOWER.rotation)
      const sn = Math.sin(MAIN_TOWER.rotation)
      const pad = plan ? 0 : 3
      const hx = Math.abs(c) * (CORE_WIDTH / 2) + Math.abs(sn) * (CORE_DEPTH / 2) + pad
      const hz = Math.abs(sn) * (CORE_WIDTH / 2) + Math.abs(c) * (CORE_DEPTH / 2) + pad
      const t = controls.target
      const nx = Math.min(px + hx, Math.max(px - hx, t.x))
      const nz = Math.min(pz + hz, Math.max(pz - hz, t.z))
      // na planta o centro fica na altura do andar; fora dela, entre o térreo e a cobertura
      const top = py + BASE_HEIGHT + MAIN_TOWER.floors * FLOOR_HEIGHT
      const ny = plan ? py + towerLevels(MAIN_TOWER.floors, MAIN_TOWER.seed)[unit.floor - 1].y : Math.min(top, Math.max(py + BASE_HEIGHT, t.y))
      const dx = nx - t.x
      const dy = ny - t.y
      const dz = nz - t.z
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 1e-6) return
      t.set(nx, ny, nz)
      camera.position.x += dx
      camera.position.y += dy
      camera.position.z += dz
    }
    controls.addEventListener('change', onChange)
    return () => controls.removeEventListener('change', onChange)
  }, [controls, camera])

  return null
}
