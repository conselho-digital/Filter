import type { Unit } from '../data/units'
import { MAIN_TOWER_FLOORS, UNITS_PER_FLOOR } from '../data/units'

export const FLOOR_HEIGHT = 0.62
export const SLAB_THICKNESS = 0.12
export const CORE_WIDTH = 4.4
export const CORE_DEPTH = 3.1

export interface TowerConfig {
  position: [number, number, number]
  floors: number
  seed: number
}

/** Torre principal, a única com unidades à venda nesta etapa. */
export const MAIN_TOWER: TowerConfig = { position: [0, 0, 0], floors: MAIN_TOWER_FLOORS, seed: 1 }

export interface Level {
  y: number
  rot: number
  dx: number
  dz: number
  scale: number
}

/** Posição, giro e escala de cada laje (a mesma regra desenha as lajes e as unidades). */
export function towerLevels(floors: number, seed: number): Level[] {
  return Array.from({ length: floors }, (_, i) => ({
    y: i * FLOOR_HEIGHT,
    rot: Math.sin(i * 0.55 + seed) * 0.16,
    dx: Math.sin(i * 0.9 + seed * 2) * 0.22,
    dz: Math.cos(i * 0.7 + seed) * 0.18,
    scale: 1 - Math.max(0, i - floors * 0.7) * 0.012,
  }))
}

/** Centro do apartamento na laje, no espaço local do andar. */
export function unitLocalX(slot: number) {
  return -CORE_WIDTH / 2 + ((slot + 0.5) * CORE_WIDTH) / UNITS_PER_FLOOR
}

/** Centro do apartamento no mundo, para apontar a câmera. */
export function unitWorldPosition(unit: Unit, tower: TowerConfig = MAIN_TOWER): [number, number, number] {
  const level = towerLevels(tower.floors, tower.seed)[unit.floor - 1]
  const lx = unitLocalX(unit.slot) * level.scale
  const lz = 0
  const cos = Math.cos(level.rot)
  const sin = Math.sin(level.rot)
  const x = lx * cos + lz * sin
  const z = -lx * sin + lz * cos
  return [
    tower.position[0] + level.dx + x,
    tower.position[1] + level.y + SLAB_THICKNESS + (FLOOR_HEIGHT - SLAB_THICKNESS) / 2,
    tower.position[2] + level.dz + z,
  ]
}
