import { UNITS, type Unit } from '../data/units'

export interface Filters {
  /** quartos aceitos; vazio = qualquer */
  rooms: number[]
  areaRange: [number, number]
  floorRange: [number, number]
  /** preço máximo em R$ */
  maxPrice: number
  onlyAvailable: boolean
  /** texto livre: casa com o número da unidade (ex.: "1804") */
  query: string
}

const areas = UNITS.map((u) => u.area)
const prices = UNITS.map((u) => u.price)
const floors = UNITS.map((u) => u.floor)

export const BOUNDS = {
  area: [Math.floor(Math.min(...areas)), Math.ceil(Math.max(...areas))] as [number, number],
  floor: [Math.min(...floors), Math.max(...floors)] as [number, number],
  price: [Math.floor(Math.min(...prices) / 100000) * 100000, Math.ceil(Math.max(...prices) / 100000) * 100000] as [number, number],
}

export const DEFAULT_FILTERS: Filters = {
  rooms: [],
  areaRange: BOUNDS.area,
  floorRange: BOUNDS.floor,
  maxPrice: BOUNDS.price[1],
  onlyAvailable: false,
  query: '',
}

export const MAX_QUERY_LENGTH = 8

/** Só dígitos e letras do número da unidade; o resto é descartado. */
export const sanitizeQuery = (q: string) => q.replace(/[^0-9a-zA-Z]/g, '').slice(0, MAX_QUERY_LENGTH)

export function matchesFilters(u: Unit, f: Filters): boolean {
  if (f.onlyAvailable && u.status !== 'available') return false
  if (f.rooms.length > 0 && !f.rooms.includes(u.bedrooms)) return false
  if (u.area < f.areaRange[0] || u.area > f.areaRange[1]) return false
  if (u.floor < f.floorRange[0] || u.floor > f.floorRange[1]) return false
  if (u.price > f.maxPrice) return false
  const q = f.query.trim().toLowerCase()
  if (q && !u.id.toLowerCase().includes(q)) return false
  return true
}

export const isDefaultFilters = (f: Filters) =>
  f.rooms.length === 0 &&
  f.areaRange[0] === BOUNDS.area[0] &&
  f.areaRange[1] === BOUNDS.area[1] &&
  f.floorRange[0] === BOUNDS.floor[0] &&
  f.floorRange[1] === BOUNDS.floor[1] &&
  f.maxPrice === BOUNDS.price[1] &&
  !f.onlyAvailable &&
  f.query === ''
