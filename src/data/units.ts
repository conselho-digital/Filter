import { createRng } from '../lib/random'

export type UnitStatus = 'available' | 'reserved' | 'sold'

export interface Unit {
  /** ex.: "B1804" = bloco B, 18º andar, apartamento 04 */
  id: string
  block: string
  floor: number
  /** posição do apartamento no andar, de 0 a UNITS_PER_FLOOR - 1 (esquerda para a direita) */
  slot: number
  number: string
  bedrooms: number
  /** área privativa em m² */
  area: number
  price: number
  status: UnitStatus
  orientation: string
}

export const MAIN_BLOCK = 'B'
export const MAIN_TOWER_FLOORS = 22
export const UNITS_PER_FLOOR = 3

/** Perfil fixo de cada posição no andar (3 apartamentos em fila, do lado do mar para o lado da cidade): quartos, área base (m²) e orientação. */
const PROFILES = [
  { bedrooms: 3, area: 142.55, orientation: 'Mar' },
  { bedrooms: 2, area: 108.4, orientation: 'Norte' },
  { bedrooms: 2, area: 96.2, orientation: 'Leste' },
] as const

const pad = (n: number) => String(n).padStart(2, '0')

function buildUnits(): Unit[] {
  const rand = createRng(2024)
  const units: Unit[] = []
  for (let floor = 1; floor <= MAIN_TOWER_FLOORS; floor++) {
    for (let slot = 0; slot < UNITS_PER_FLOOR; slot++) {
      const p = PROFILES[slot]
      const roll = rand()
      // andares baixos vendem primeiro
      const pSold = Math.max(0.1, 0.5 - floor * 0.018)
      const status: UnitStatus = roll < pSold ? 'sold' : roll < pSold + 0.16 ? 'reserved' : 'available'
      const area = Math.round((p.area + floor * 0.12) * 100) / 100
      const price = Math.round((area * (9200 + floor * 240)) / 1000) * 1000
      units.push({
        id: `${MAIN_BLOCK}${pad(floor)}${pad(slot + 1)}`,
        block: MAIN_BLOCK,
        floor,
        slot,
        number: pad(slot + 1),
        bedrooms: p.bedrooms,
        area,
        price,
        status,
        orientation: p.orientation,
      })
    }
  }
  return units
}

export const UNITS: Unit[] = buildUnits()
export const UNITS_BY_ID = new Map(UNITS.map((u) => [u.id, u]))
