import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Unit } from '../../data/units'
import { UNITS_PER_FLOOR } from '../../data/units'
import { CORE_DEPTH, CORE_WIDTH, FLOOR_HEIGHT, SLAB_THICKNESS, unitLocalX } from '../../lib/tower'
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/status'
import { useStore } from '../../store/useStore'

const WIDTH = CORE_WIDTH / UNITS_PER_FLOOR - 0.06
const HEIGHT = FLOOR_HEIGHT - SLAB_THICKNESS - 0.04
const DEPTH = CORE_DEPTH + 0.1

/** Volumes translúcidos clicáveis de um andar, coloridos pelo status da unidade. */
export function UnitSlabs({ units }: { units: Unit[] }) {
  const selectedId = useStore((s) => s.selectedUnitId)
  const hoveredId = useStore((s) => s.hoveredUnitId)
  const selectUnit = useStore((s) => s.selectUnit)
  const setHovered = useStore((s) => s.setHoveredUnit)
  const viewMode = useStore((s) => s.viewMode)

  // na vista da varanda só a arquitetura aparece (sem volumes coloridos nem etiquetas)
  if (viewMode === 'windowView') return null

  return (
    <>
      {units.map((u) => {
        const selected = u.id === selectedId
        const hovered = u.id === hoveredId
        const color = STATUS_COLOR[u.status]
        return (
          <mesh
            key={u.id}
            position={[unitLocalX(u.slot), SLAB_THICKNESS + FLOOR_HEIGHT / 2 - SLAB_THICKNESS / 2, 0]}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation()
              setHovered(null) // em toque não há pointerout: evita realce preso
              selectUnit(u.id)
            }}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              setHovered(u.id)
            }}
            onPointerOut={() => setHovered(null)}
          >
            <boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={selected ? 1.1 : hovered ? 0.7 : 0.25}
              transparent
              opacity={selected ? 0.95 : hovered ? 0.85 : 0.55}
              depthWrite={false}
            />
            {(hovered || selected) && (
              <Html center distanceFactor={14} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                <div className="glass whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm font-medium text-white">
                  {u.id}
                  <div className="text-xs font-normal text-white/70">{STATUS_LABEL[u.status]}</div>
                </div>
              </Html>
            )}
          </mesh>
        )
      })}
    </>
  )
}
