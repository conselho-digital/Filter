import type { Unit } from '../data/units'

export interface Room {
  name: string
  /** posição e tamanho em metros, origem no canto superior esquerdo da planta */
  x: number
  y: number
  w: number
  h: number
  /** varanda e áreas externas são desenhadas com traço diferente */
  outdoor?: boolean
}

export interface FloorPlan {
  width: number
  depth: number
  rooms: Room[]
}

const BALCONY_DEPTH = 2.2
const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * Planta procedural e determinística: varanda na frente (lado do mar), sala e cozinha no meio,
 * quartos e banheiros nos fundos. As medidas derivam da área privativa da unidade.
 */
export function buildFloorPlan(unit: Unit): FloorPlan {
  const total = unit.area
  const width = r1(Math.sqrt(total * 1.55))
  const depth = r1(total / width)
  const inner = depth - BALCONY_DEPTH
  const backDepth = r1(inner * 0.44)
  const frontDepth = r1(inner - backDepth)

  const rooms: Room[] = []
  rooms.push({ name: 'Varanda', x: 0, y: 0, w: width, h: BALCONY_DEPTH, outdoor: true })

  // faixa da frente: sala (60%) e cozinha/serviço (40%)
  const livingW = r1(width * 0.6)
  rooms.push({ name: 'Sala', x: 0, y: BALCONY_DEPTH, w: livingW, h: frontDepth })
  const kitchenH = r1(frontDepth * 0.6)
  rooms.push({ name: 'Cozinha', x: livingW, y: BALCONY_DEPTH, w: r1(width - livingW), h: kitchenH })
  rooms.push({ name: 'Serviço', x: livingW, y: r1(BALCONY_DEPTH + kitchenH), w: r1(width - livingW), h: r1(frontDepth - kitchenH) })

  // faixa dos fundos: banheiro social + quartos (o primeiro é suíte)
  const backY = r1(BALCONY_DEPTH + frontDepth)
  const bathW = r1(Math.min(2.4, width * 0.16))
  const bedW = r1((width - bathW) / unit.bedrooms)
  rooms.push({ name: 'Banho', x: 0, y: backY, w: bathW, h: backDepth })
  for (let i = 0; i < unit.bedrooms; i++) {
    rooms.push({
      name: i === 0 ? 'Suíte' : `Quarto ${i + 1}`,
      x: r1(bathW + i * bedW),
      y: backY,
      w: i === unit.bedrooms - 1 ? r1(width - bathW - i * bedW) : bedW,
      h: backDepth,
    })
  }
  return { width, depth, rooms }
}
