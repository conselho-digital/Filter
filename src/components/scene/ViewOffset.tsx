import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { useStore } from '../../store/useStore'

/** largura do painel da unidade no computador (ver UnitPanel) */
const PANEL_W = 760

/**
 * Com o painel da unidade aberto no computador, desloca a projeção da câmera para que o centro da câmera
 * (a unidade escolhida) apareça no meio da área livre à esquerda do painel, e não atrás dele.
 */
export function ViewOffset() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const panelOpen = useStore((s) => s.selectedUnitId !== null && (s.viewMode === 'unit' || s.viewMode === 'floorplan'))

  useEffect(() => {
    const desktop = size.width >= 768
    const shift = panelOpen && desktop ? Math.min(PANEL_W, size.width - 320) / 2 : 0
    if (shift > 0) camera.setViewOffset(size.width, size.height, shift, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, panelOpen, invalidate])

  useEffect(
    () => () => {
      camera.clearViewOffset()
      camera.updateProjectionMatrix()
    },
    [camera],
  )
  return null
}
