import type { Unit } from '../data/units'
import { MAIN_TOWER_FLOORS, UNITS_PER_FLOOR } from '../data/units'

/** altura do térreo (lobby em vidro com pilotis) sob o primeiro andar */
export const BASE_HEIGHT = 0.9
/** largura de um vão (um apartamento) na fachada */
export const BAY = 4.4 / UNITS_PER_FLOOR
export const BALCONY_DEPTH = 0.5
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
export function towerLevels(floors: number, _seed: number): Level[] {
  // torre reta (sem giro nem afunilamento); o térreo de vidro eleva o primeiro andar
  return Array.from({ length: floors }, (_, i) => ({
    y: BASE_HEIGHT + i * FLOOR_HEIGHT,
    rot: 0,
    dx: 0,
    dz: 0,
    scale: 1,
  }))
}

/** As varandas formam um tijolo: andares ímpares deslocam meio vão. */
export function balconyShift(floor: number) {
  return floor % 2 === 0 ? BAY / 2 : 0
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

/** Oeste e Leste dariam numa torre vizinha: a vista principal já gira para o mar. */
const SEA_BIAS: Record<string, number> = { Oeste: -0.9, Leste: 0.9 }

/** Ponto de vista na varanda (olhos da unidade) e direção do olhar, em coordenadas do mundo. */
export function unitWindowPose(unit: Unit, view: WindowViewId, tower: TowerConfig = MAIN_TOWER): WindowPose {
  const level = towerLevels(tower.floors, tower.seed)[unit.floor - 1]
  const [dx, dz] = ORIENTATION_DIR[unit.orientation] ?? [0, -1]
  // fica logo além da fachada, ainda sob a laje de cima (que serve de teto da varanda)
  const lx = dx !== 0 ? dx * (CORE_WIDTH / 2 + 0.3) : unitLocalX(unit.slot) + balconyShift(unit.floor)
  const lz = dz !== 0 ? dz * (CORE_DEPTH / 2 + 0.2) : 0
  const sx = lx * level.scale
  const sz = lz * level.scale
  const cos = Math.cos(level.rot)
  const sin = Math.sin(level.rot)
  const y = tower.position[1] + level.y + SLAB_THICKNESS + (FLOOR_HEIGHT - SLAB_THICKNESS) * 0.72
  const baseYaw = Math.atan2(-dx, -dz) + (SEA_BIAS[unit.orientation] ?? 0) + level.rot
  return {
    position: [
      tower.position[0] + level.dx + sx * cos + sz * sin,
      y,
      tower.position[2] + level.dz - sx * sin + sz * cos,
    ],
    yaw: view === 'view2' ? baseYaw + 0.95 : baseYaw,
  }
}
