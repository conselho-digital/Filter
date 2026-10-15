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

export type WindowViewId = 'view1' | 'view2'

export interface WindowPose {
  position: [number, number, number]
  /** giro em Y (rad): 0 olha para -z; o forward é (-sin, -cos) */
  yaw: number
}

/** Direção da vista principal de cada orientação, no espaço local do andar. */
const ORIENTATION_DIR: Record<string, [number, number]> = {
  Mar: [0, -1],
  Sul: [0, 1],
  Oeste: [-1, 0],
  Leste: [1, 0],
}

/** Ponto de vista na varanda (olhos da unidade) e direção do olhar, em coordenadas do mundo. */
export function unitWindowPose(unit: Unit, view: WindowViewId, tower: TowerConfig = MAIN_TOWER): WindowPose {
  const level = towerLevels(tower.floors, tower.seed)[unit.floor - 1]
  const [dx, dz] = ORIENTATION_DIR[unit.orientation] ?? [0, -1]
  // fica logo além da fachada, ainda sob a laje de cima (que serve de teto da varanda)
  const lx = dx !== 0 ? dx * (CORE_WIDTH / 2 + 0.3) : unitLocalX(unit.slot)
  const lz = dz !== 0 ? dz * (CORE_DEPTH / 2 + 0.2) : 0
  const sx = lx * level.scale
  const sz = lz * level.scale
  const cos = Math.cos(level.rot)
  const sin = Math.sin(level.rot)
  const y = tower.position[1] + level.y + SLAB_THICKNESS + (FLOOR_HEIGHT - SLAB_THICKNESS) * 0.55
  const baseYaw = Math.atan2(-dx, -dz) + level.rot
  return {
    position: [
      tower.position[0] + level.dx + sx * cos + sz * sin,
      y,
      tower.position[2] + level.dz - sx * sin + sz * cos,
    ],
    yaw: view === 'view2' ? baseYaw + 0.95 : baseYaw,
  }
}
