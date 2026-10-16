import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { UNITS_BY_ID } from '../../data/units'
import { CORE_DEPTH, CORE_WIDTH, MAIN_TOWER, towerLevels } from '../../lib/tower'
import { useStore } from '../../store/useStore'

/**
 * Na planta aberta o centro da câmera só se move dentro do pavimento: o alvo fica preso ao retângulo da torre
 * (e na altura do andar), então o apartamento nunca sai da tela.
 */
export function PanClamp() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    if (!controls) return
    const onChange = () => {
      const st = useStore.getState()
      if (st.viewMode !== 'floorplan' || !st.selectedUnitId) return
      const unit = UNITS_BY_ID.get(st.selectedUnitId)
      if (!unit) return
      const [px, py, pz] = MAIN_TOWER.position
      const y = py + towerLevels(MAIN_TOWER.floors, MAIN_TOWER.seed)[unit.floor - 1].y
      // retângulo do pavimento no mundo (a torre está girada; usamos o maior lado nos dois eixos por segurança)
      const c = Math.cos(MAIN_TOWER.rotation)
      const sn = Math.sin(MAIN_TOWER.rotation)
      const hx = Math.abs(c) * (CORE_WIDTH / 2) + Math.abs(sn) * (CORE_DEPTH / 2)
      const hz = Math.abs(sn) * (CORE_WIDTH / 2) + Math.abs(c) * (CORE_DEPTH / 2)
      const t = controls.target
      const nx = Math.min(px + hx, Math.max(px - hx, t.x))
      const nz = Math.min(pz + hz, Math.max(pz - hz, t.z))
      const dx = nx - t.x
      const dy = y - t.y
      const dz = nz - t.z
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 1e-6) return
      t.set(nx, y, nz)
      camera.position.x += dx
      camera.position.y += dy
      camera.position.z += dz
    }
    controls.addEventListener('change', onChange)
    return () => controls.removeEventListener('change', onChange)
  }, [controls, camera])

  return null
}
