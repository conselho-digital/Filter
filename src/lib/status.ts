import type { UnitStatus } from '../data/units'

export const STATUS_COLOR: Record<UnitStatus, string> = {
  available: '#2f8cff',
  reserved: '#f2b632',
  sold: '#e0443e',
}

export const STATUS_LABEL: Record<UnitStatus, string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  sold: 'Vendido',
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const m2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Tipologia no padrão português: T1, T2, T3... (número de quartos). */
export const typology = (bedrooms: number) => `T${bedrooms}`

export const formatPrice = (v: number) => brl.format(v)
const ft2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
let areaUnit: 'm2' | 'ft2' = 'm2'
/** Unidade usada por `formatArea` (a loja chama isto ao trocar m²/ft² nas configurações). */
export const setAreaUnitFormat = (u: 'm2' | 'ft2') => {
  areaUnit = u
}
export const formatArea = (v: number) => (areaUnit === 'ft2' ? `${ft2.format(v * 10.7639)} ft²` : `${m2.format(v)} m²`)
