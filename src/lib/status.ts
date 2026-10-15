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

export const formatPrice = (v: number) => brl.format(v)
export const formatArea = (v: number) => `${m2.format(v)} m²`
