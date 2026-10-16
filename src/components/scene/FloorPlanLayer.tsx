import { useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Unit } from '../../data/units'
import { UNITS_PER_FLOOR } from '../../data/units'
import { buildFloorPlan } from '../../lib/floorplan'
import { CORE_DEPTH, FLOOR_HEIGHT, unitSpan } from '../../lib/tower'
import { useStore } from '../../store/useStore'

/** metros por unidade da cena (andar de 3 m = FLOOR_HEIGHT) */
const M = 3 / FLOOR_HEIGHT
const WALL_H = 0.16
const WALL_T = 0.03
const FLOOR_Y = 0.03

interface PlacedRoom {
  name: string
  outdoor: boolean
  cx: number
  cz: number
  sx: number
  sz: number
}

/**
 * Encaixa a planta da unidade no seu trecho do pavimento: o lado da varanda (frente da planta) fica
 * na fachada principal do apartamento (empenas nas pontas, fachada longa no do meio).
 */
function placeUnit(unit: Unit): { rooms: PlacedRoom[]; x0: number; x1: number } {
  const [x0, x1] = unitSpan(unit.slot)
  const zA = -CORE_DEPTH / 2
  const w = x1 - x0
  const last = unit.slot === UNITS_PER_FLOOR - 1
  const middle = unit.slot > 0 && !last
  const size = middle ? { width: w * M, depth: CORE_DEPTH * M } : { width: CORE_DEPTH * M, depth: w * M }
  const plan = buildFloorPlan(unit, size)
  // ponto da planta (px, py em metros) -> local da torre (x, z)
  const map = (px: number, py: number): [number, number] => {
    if (middle) return [x0 + px / M, zA + py / M]
    if (last) return [x1 - py / M, -zA - px / M]
    return [x0 + py / M, zA + px / M]
  }
  const rooms = plan.rooms.map((r) => {
    const [ax, az] = map(r.x, r.y)
    const [bx, bz] = map(r.x + r.w, r.y + r.h)
    return {
      name: r.name,
      outdoor: !!r.outdoor,
      cx: (ax + bx) / 2,
      cz: (az + bz) / 2,
      sx: Math.abs(bx - ax),
      sz: Math.abs(bz - az),
    }
  })
  return { rooms, x0, x1 }
}

/** Etiqueta em sprite (texto desenhado num canvas, sem fonte externa). */
function Label({ text, x, z, scale = 1, strong = false }: { text: string; x: number; z: number; scale?: number; strong?: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 64
    const g = c.getContext('2d')!
    g.font = `${strong ? 700 : 600} 30px Inter, system-ui, sans-serif`
    const tw = Math.min(244, g.measureText(text).width + 24)
    g.fillStyle = strong ? 'rgba(47,140,255,0.95)' : 'rgba(255,255,255,0.92)'
    g.fillRect((256 - tw) / 2, 10, tw, 44)
    g.fillStyle = strong ? '#ffffff' : '#0a0f1d'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, 128, 33, 236)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [text, strong])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <sprite position={[x, FLOOR_Y + WALL_H + 0.25, z]} scale={[1.6 * scale, 0.4 * scale, 1]} renderOrder={5}>
      <spriteMaterial map={tex} transparent depthTest={false} toneMapped={false} fog={false} />
    </sprite>
  )
}

/** Plantas dos apartamentos do pavimento, desenhadas sobre a laje com paredes baixas em corte. */
export function FloorPlanLayer({ units, selectedId }: { units: Unit[]; selectedId: string | null }) {
  const placed = useMemo(() => units.map((u) => ({ unit: u, ...placeUnit(u) })), [units])

  const pick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    useStore.setState({ selectedUnitId: id, hoveredUnitId: null })
  }

  return (
    <group>
      {placed.map(({ unit, rooms, x0, x1 }) => {
        const sel = unit.id === selectedId
        const wall = sel ? '#2a2f36' : '#7b818a'
        return (
          <group key={unit.id}>
            {rooms.map((r, i) => (
              <group key={i}>
                <mesh position={[r.cx, FLOOR_Y, r.cz]} rotation={[-Math.PI / 2, 0, 0]} onClick={pick(unit.id)} receiveShadow>
                  <planeGeometry args={[Math.max(0.01, r.sx - 0.01), Math.max(0.01, r.sz - 0.01)]} />
                  <meshStandardMaterial color={r.outdoor ? '#d8c9ab' : sel ? '#f3eee4' : '#c9cdd3'} roughness={0.9} />
                </mesh>
                {/* paredes baixas em corte nos quatro lados do cômodo */}
                {[
                  [r.cx, r.cz - r.sz / 2, r.sx, WALL_T],
                  [r.cx, r.cz + r.sz / 2, r.sx, WALL_T],
                  [r.cx - r.sx / 2, r.cz, WALL_T, r.sz],
                  [r.cx + r.sx / 2, r.cz, WALL_T, r.sz],
                ].map(([x, z, sx, sz], k) => (
                  <mesh key={k} position={[x, FLOOR_Y + WALL_H / 2, z]} castShadow>
                    <boxGeometry args={[sx, WALL_H, sz]} />
                    <meshStandardMaterial color={wall} roughness={0.8} />
                  </mesh>
                ))}
                {sel && <Label text={r.name} x={r.cx} z={r.cz} scale={0.75} />}
              </group>
            ))}
            {/* contorno azul do apartamento escolhido */}
            {sel &&
              [
                [(x0 + x1) / 2, -CORE_DEPTH / 2, x1 - x0, 0.06],
                [(x0 + x1) / 2, CORE_DEPTH / 2, x1 - x0, 0.06],
                [x0, 0, 0.06, CORE_DEPTH],
                [x1, 0, 0.06, CORE_DEPTH],
              ].map(([x, z, sx, sz], k) => (
                <mesh key={k} position={[x, FLOOR_Y + WALL_H + 0.01, z]}>
                  <boxGeometry args={[sx, 0.03, sz]} />
                  <meshBasicMaterial color="#2f8cff" toneMapped={false} />
                </mesh>
              ))}
            {!sel && <Label text={unit.id} x={(x0 + x1) / 2} z={0} />}
          </group>
        )
      })}
    </group>
  )
}
