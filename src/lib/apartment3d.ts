import type { Unit } from '../data/units'
import { buildFloorPlan, type FloorPlan, type Room } from './floorplan'

/**
 * Apartamento mobiliado em 3D, gerado a partir da planta da unidade (em metros).
 * Convenção: x da planta = x do mundo; y da planta = z do mundo; a varanda fica em z = 0 (frente, para o mar).
 */

export type Shape = 'box' | 'cyl' | 'sph'

export interface Prim {
  shape: Shape
  /** centro */
  x: number
  y: number
  z: number
  /** dimensões (cilindro e esfera: sx = diâmetro) */
  sx: number
  sy: number
  sz: number
  color: string
  rx?: number
  ry?: number
  rz?: number
  opacity?: number
  rough?: number
  metal?: number
  /** não projeta sombra (peças finas) */
  noShadow?: boolean
}

export interface RoomLabel {
  name: string
  size: string
  x: number
  z: number
}

export interface Apartment3D {
  plan: FloorPlan
  prims: Prim[]
  labels: RoomLabel[]
  /** centro da planta, para a câmera */
  center: [number, number, number]
}

// paleta (madeira quente, tons neutros, verdes de plantas)
const C = {
  wall: '#ece6db',
  wallDark: '#d9d1c2',
  slab: '#6e6a63',
  wood: '#c8955c',
  woodDark: '#8a5a32',
  oak: '#a87646',
  deck: '#b5834f',
  tile: '#dcd8d0',
  bathTile: '#e6e8ea',
  sofa: '#cfc7b8',
  sofaDark: '#b8ae9c',
  rug: '#ddd3c1',
  white: '#f4f2ee',
  steel: '#c9ccd1',
  dark: '#2a2d31',
  glass: '#bfe3ea',
  bedLinen: '#efe9df',
  blue: '#8aa0b5',
  green: '#8fae9a',
  leaf: '#4c9a3a',
  leafDark: '#37762c',
  pot: '#8a6b4f',
}

const WALL_T = 0.12
const WALL_TALL = 2.5
const WALL_CUT = 1.15

const box = (
  x: number, z: number, w: number, d: number, h: number, color: string, y0 = 0, extra: Partial<Prim> = {},
): Prim => ({ shape: 'box', x, y: y0 + h / 2, z, sx: w, sy: h, sz: d, color, ...extra })

const cyl = (x: number, z: number, dia: number, h: number, color: string, y0 = 0, extra: Partial<Prim> = {}): Prim => ({
  shape: 'cyl', x, y: y0 + h / 2, z, sx: dia, sy: h, sz: dia, color, ...extra,
})

/** Folhagem de bananeira: folhas longas e inclinadas saindo de um vaso. */
function plant(x: number, z: number, scale = 1): Prim[] {
  const out: Prim[] = [cyl(x, z, 0.34 * scale, 0.3 * scale, C.pot)]
  const n = 9
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + k * 0.7
    const lean = 0.5 + ((k * 37) % 10) / 22
    const h = (0.55 + ((k * 53) % 10) / 20) * scale
    out.push({
      shape: 'box',
      x: x + Math.cos(ang) * 0.14 * scale * lean,
      y: 0.3 * scale + h / 2,
      z: z + Math.sin(ang) * 0.14 * scale * lean,
      sx: 0.16 * scale,
      sy: h,
      sz: 0.02,
      color: k % 2 ? C.leaf : C.leafDark,
      rx: Math.sin(ang) * lean,
      rz: -Math.cos(ang) * lean,
      noShadow: true,
    })
  }
  return out
}

function chair(x: number, z: number, faceX: number, faceZ: number, color = C.oak): Prim[] {
  // cadeira simples voltada para (faceX, faceZ)
  const ry = Math.atan2(faceX, faceZ)
  const back = 0.2
  return [
    box(x, z, 0.44, 0.44, 0.06, color, 0.42, { ry }),
    box(x - Math.sin(ry) * back, z - Math.cos(ry) * back, 0.44, 0.05, 0.46, color, 0.46, { ry }),
    cyl(x, z, 0.06, 0.42, C.dark),
  ]
}

function table(x: number, z: number, w: number, d: number, color: string, h = 0.74): Prim[] {
  const lx = w / 2 - 0.08
  const lz = d / 2 - 0.08
  return [
    box(x, z, w, d, 0.05, color, h - 0.05),
    box(x - lx, z - lz, 0.06, 0.06, h - 0.05, C.dark),
    box(x + lx, z - lz, 0.06, 0.06, h - 0.05, C.dark),
    box(x - lx, z + lz, 0.06, 0.06, h - 0.05, C.dark),
    box(x + lx, z + lz, 0.06, 0.06, h - 0.05, C.dark),
  ]
}

function bed(cx: number, backZ: number, w: number, len: number, linen: string, double: boolean): Prim[] {
  // cabeceira contra a parede de trás (z = backZ), pés voltados para -z
  const zc = backZ - len / 2
  const out: Prim[] = [
    box(cx, zc, w + 0.1, len + 0.05, 0.3, C.woodDark, 0.0),
    box(cx, zc, w, len, 0.22, C.bedLinen, 0.3),
    box(cx, backZ - 0.06, w + 0.2, 0.1, 0.95, C.woodDark, 0),
    box(cx, zc - len * 0.18, w - 0.05, len * 0.55, 0.06, linen, 0.5),
  ]
  const pillows = double ? [-0.4, 0.4] : [0]
  for (const dx of pillows) out.push(box(cx + dx * (w / 1.6), backZ - 0.35, 0.58, 0.36, 0.12, C.white, 0.52))
  return out
}

/** Paredes: caixas finas; `gaps` são aberturas de porta (metros ao longo do segmento). */
function wall(
  ax: number, az: number, bx: number, bz: number, h: number, color: string, gaps: [number, number][] = [],
): Prim[] {
  const len = Math.hypot(bx - ax, bz - az)
  if (len < 0.01) return []
  const ux = (bx - ax) / len
  const uz = (bz - az) / len
  // rotação Y que leva o eixo x local para a direção do segmento
  const ry = Math.atan2(-uz, ux)
  const cuts = [...gaps].sort((g, k) => g[0] - k[0])
  const pieces: [number, number][] = []
  let t = 0
  for (const [g0, g1] of cuts) {
    if (g0 > t) pieces.push([t, g0])
    t = Math.max(t, g1)
  }
  if (t < len) pieces.push([t, len])
  const out: Prim[] = []
  for (const [t0, t1] of pieces) {
    const mid = (t0 + t1) / 2
    out.push({ shape: 'box', x: ax + ux * mid, y: h / 2, z: az + uz * mid, sx: t1 - t0, sy: h, sz: WALL_T, color, ry })
  }
  // verga acima das portas das paredes altas
  if (h > 2.1) {
    for (const [g0, g1] of cuts) {
      const mid = (g0 + g1) / 2
      out.push({ shape: 'box', x: ax + ux * mid, y: (h + 2.05) / 2, z: az + uz * mid, sx: g1 - g0, sy: h - 2.05, sz: WALL_T, color, ry })
    }
  }
  return out
}

const find = (plan: FloorPlan, name: string): Room | undefined => plan.rooms.find((r) => r.name === name)

export function buildApartment3D(unit: Unit): Apartment3D {
  const plan = buildFloorPlan(unit)
  const W = plan.width
  const D = plan.depth
  const prims: Prim[] = []
  const labels: RoomLabel[] = []

  const varanda = find(plan, 'Varanda')!
  const sala = find(plan, 'Sala')!
  const cozinha = find(plan, 'Cozinha')!
  const servico = find(plan, 'Serviço')!
  const banho = find(plan, 'Banho')
  const sleeping = plan.rooms.filter((r) => r.name === 'Suíte' || r.name.startsWith('Quarto'))
  const frontZ = varanda.h // z da fachada (atrás da varanda)
  const backRowZ = banho ? banho.y : (sleeping[0]?.y ?? D)

  // laje-base escura e pisos
  prims.push(box(W / 2, D / 2 + 0.05, W + 0.5, D + 0.1, 0.22, C.slab, -0.24))
  for (const r of plan.rooms) {
    const isWet = r.name === 'Banho' || r.name === 'Cozinha' || r.name === 'Serviço'
    const color = r.outdoor ? C.deck : isWet ? (r.name === 'Banho' ? C.bathTile : C.tile) : C.wood
    prims.push(box(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, 0.04, color, -0.02, { noShadow: true }))
    labels.push({ name: r.name, size: `${r.w.toFixed(1).replace('.', ',')} × ${r.h.toFixed(1).replace('.', ',')} m`, x: r.x + r.w / 2, z: r.y + r.h / 2 })
  }

  // paredes externas: fundos e lateral direita altas; lateral esquerda e fachada em corte
  prims.push(...wall(0, D, W, D, WALL_TALL, C.wall))
  prims.push(...wall(W, frontZ, W, D, WALL_TALL, C.wall))
  prims.push(...wall(0, frontZ, 0, D, WALL_CUT, C.wall))
  // fachada: peitoril baixo + vidro de piso a teto com montantes finos
  prims.push(...wall(0, frontZ, W, frontZ, 0.35, C.wallDark))
  prims.push(box(W / 2, frontZ, W, WALL_T * 0.5, WALL_TALL - 0.35, C.glass, 0.35, { opacity: 0.16, noShadow: true, rough: 0.05 }))
  const mull = Math.max(3, Math.round(W / 1.7))
  for (let k = 0; k <= mull; k++) prims.push(box((k * W) / mull, frontZ, 0.035, 0.05, WALL_TALL - 0.3, '#8d939b', 0.3, { noShadow: true }))
  prims.push(box(W / 2, frontZ, W, 0.05, 0.04, '#8d939b', WALL_TALL, { noShadow: true }))

  // divisórias do setor íntimo, com porta em cada ambiente
  const rowRooms = [...(banho ? [banho] : []), ...sleeping].sort((a, b) => a.x - b.x)
  const doors: [number, number][] = rowRooms.map((r) => [r.x + 0.3, r.x + Math.min(r.w - 0.2, 1.2)] as [number, number])
  prims.push(...wall(0, backRowZ, W, backRowZ, WALL_CUT, C.wall, doors))
  for (const r of rowRooms.slice(1)) prims.push(...wall(r.x, backRowZ, r.x, D, WALL_CUT, C.wall))

  // janelas nas paredes altas (fundos, nos quartos; lateral direita, na cozinha e no serviço)
  for (const r of rowRooms) {
    if (r.name === 'Banho') {
      prims.push(box(r.x + r.w / 2, D - WALL_T / 2, 0.7, 0.04, 0.5, '#cfe8f5', 1.5, { opacity: 0.92, noShadow: true }))
    } else {
      const ww = Math.min(1.8, r.w * 0.5)
      prims.push(box(r.x + r.w / 2, D - WALL_T / 2 - 0.02, ww + 0.12, 0.05, 1.18, C.dark, 0.88, { noShadow: true }))
      prims.push(box(r.x + r.w / 2, D - WALL_T / 2 - 0.04, ww, 0.04, 1.06, '#cfe8f5', 0.94, { opacity: 0.92, noShadow: true, rough: 0.05 }))
    }
  }
  for (const r of [cozinha, servico]) {
    prims.push(box(W - WALL_T / 2 - 0.02, r.y + r.h / 2, 0.05, Math.min(1.4, r.h * 0.6) + 0.12, 1.18, C.dark, 0.88, { noShadow: true }))
    prims.push(box(W - WALL_T / 2 - 0.04, r.y + r.h / 2, 0.04, Math.min(1.4, r.h * 0.6), 1.06, '#cfe8f5', 0.94, { opacity: 0.92, noShadow: true, rough: 0.05 }))
  }

  // ---- sala: TV, sofá em L, mesa de centro, tapete, jantar e aparador
  {
    const cz = sala.y + sala.h / 2
    const lx = sala.x
    prims.push(box(lx + 2.5, cz, 3.0, 2.2, 0.02, C.rug, 0.02, { noShadow: true }))
    prims.push(box(lx + 0.3, cz, 0.45, 2.2, 0.5, C.woodDark))
    prims.push(box(lx + 0.12, cz, 0.06, 1.35, 0.75, '#15171a', 0.85))
    // sofá em L voltado para a TV
    prims.push(box(lx + 4.15, cz - 0.15, 0.95, 2.5, 0.42, C.sofa, 0.05))
    prims.push(box(lx + 4.55, cz - 0.15, 0.2, 2.5, 0.85, C.sofa, 0.05))
    prims.push(box(lx + 3.55, cz + 1.0, 1.6, 0.9, 0.42, C.sofaDark, 0.05))
    prims.push(box(lx + 4.05, cz - 0.9, 0.5, 0.7, 0.14, C.sofaDark, 0.47))
    prims.push(box(lx + 2.5, cz, 1.0, 0.9, 0.36, C.oak, 0.04))
    prims.push(...plant(lx + 0.45, sala.y + 0.45, 1.1))
    // jantar à direita da sala, com aparador na parede do fundo
    const dx = sala.x + sala.w - 2.2
    prims.push(...table(dx, cz - 0.2, 1.9, 0.95, C.woodDark))
    for (const k of [-0.6, 0, 0.6]) {
      prims.push(...chair(dx + k, cz - 0.2 - 0.75, 0, 1))
      prims.push(...chair(dx + k, cz - 0.2 + 0.75, 0, -1))
    }
    prims.push(box(dx, sala.y + sala.h - 0.28, 2.4, 0.45, 0.85, C.sofa))
    prims.push(...plant(sala.x + sala.w - 0.4, sala.y + sala.h - 0.4, 0.9))
  }

  // ---- cozinha aberta: bancadas em L, ilha com banquetas, geladeira
  {
    const k = cozinha
    prims.push(box(k.x + k.w / 2, k.y + 0.32, k.w - 0.1, 0.62, 0.9, C.woodDark))
    prims.push(box(k.x + k.w / 2, k.y + 0.32, k.w - 0.1, 0.64, 0.04, '#efece6', 0.9))
    prims.push(box(k.x + k.w / 2, k.y + 0.16, k.w - 0.1, 0.34, 0.75, C.woodDark, 1.45))
    prims.push(box(k.x + k.w * 0.55, k.y + 0.32, 0.6, 0.5, 0.02, '#101214', 0.94, { noShadow: true }))
    prims.push(box(k.x + k.w * 0.25, k.y + 0.32, 0.55, 0.4, 0.02, '#a9afb6', 0.94, { noShadow: true }))
    prims.push(box(k.x + k.w - 0.32, k.y + k.h * 0.55, 0.62, Math.max(0.6, k.h - 1.4), 0.9, C.woodDark))
    prims.push(box(k.x + k.w - 0.32, k.y + k.h * 0.55, 0.64, Math.max(0.6, k.h - 1.4), 0.04, '#efece6', 0.9))
    prims.push(box(k.x + k.w - 0.4, k.y + k.h - 0.38, 0.72, 0.7, 1.9, C.steel))
    const ix = k.x + k.w * 0.4
    const iz = k.y + k.h * 0.6
    prims.push(box(ix, iz, 1.7, 0.8, 0.92, '#f0ece4'))
    prims.push(box(ix, iz, 1.76, 0.86, 0.04, '#e8e2d6', 0.92))
    for (const dx of [-0.55, 0, 0.55]) prims.push(cyl(ix + dx, iz + 0.75, 0.34, 0.66, C.dark, 0))
  }

  // ---- área de serviço
  {
    const s = servico
    prims.push(box(s.x + s.w - 0.45, s.y + 0.4, 0.62, 0.62, 0.86, C.white))
    prims.push(cyl(s.x + s.w - 0.45, s.y + 0.72, 0.36, 0.03, C.dark, 0.5, { rz: Math.PI / 2, ry: 0 }))
    prims.push(box(s.x + s.w - 1.2, s.y + 0.4, 0.62, 0.62, 0.86, C.white))
    prims.push(box(s.x + 0.55, s.y + 0.36, 0.7, 0.5, 0.9, '#cfd3d8'))
    prims.push(box(s.x + 1.7, s.y + s.h - 0.25, 0.5, 0.4, 0.35, '#c8b79c'))
  }

  // ---- suíte e quartos
  let bedroomIndex = 0
  for (const r of sleeping) {
    const cx = r.x + r.w / 2
    const back = r.y + r.h - 0.06
    const isSuite = r.name === 'Suíte'
    const w = isSuite ? 1.6 : 1.0
    const len = Math.min(2.0, r.h - 0.35)
    const bx = isSuite ? cx : r.x + 0.4 + w / 2 + 0.1
    prims.push(box(cx, r.y + r.h - 1.4, Math.min(r.w - 0.8, isSuite ? 2.6 : 2.2), 1.9, 0.02, C.rug, 0.02, { noShadow: true }))
    prims.push(...bed(bx, back, w, len, bedroomIndex % 2 ? C.green : C.blue, isSuite))
    if (isSuite) {
      for (const dx of [-1.2, 1.2]) prims.push(box(bx + dx, back - 0.25, 0.46, 0.42, 0.46, C.woodDark))
      prims.push(box(r.x + 0.32, r.y + r.h / 2 - 0.05, 0.6, Math.min(2.0, r.h - 0.7), 2.1, C.woodDark))
    } else {
      // mesa de estudo e cadeira junto ao fundo; guarda-roupa na lateral
      const dxx = r.x + r.w - 1.0
      prims.push(...table(dxx, r.y + r.h - 0.4, 1.2, 0.6, C.oak, 0.74))
      prims.push(...chair(dxx, r.y + r.h - 0.95, 0, 1, C.dark))
      prims.push(box(dxx, r.y + r.h - 0.42, 0.45, 0.04, 0.3, '#15171a', 0.8))
      prims.push(box(r.x + r.w - 0.32, r.y + 0.6, 0.6, 1.1, 2.0, C.woodDark))
    }
    bedroomIndex++
  }

  // ---- banho: bancada com cuba, vaso, box de vidro
  if (banho) {
    prims.push(box(banho.x + 0.5, banho.y + 0.32, 0.85, 0.5, 0.85, C.sofa))
    prims.push(cyl(banho.x + 0.5, banho.y + 0.32, 0.4, 0.05, C.white, 0.85))
    prims.push(box(banho.x + banho.w - 0.45, banho.y + banho.h - 0.5, 0.4, 0.62, 0.4, C.white))
    prims.push(box(banho.x + banho.w - 0.45, banho.y + banho.h - 0.15, 0.4, 0.2, 0.7, C.white))
    prims.push(box(banho.x + 0.6, banho.y + banho.h - 0.6, 1.0, 1.0, 0.03, '#d6d9dc', 0))
    prims.push(box(banho.x + 0.6, banho.y + banho.h - 0.6, 1.0, 1.0, 1.9, C.glass, 0.04, { opacity: 0.18, noShadow: true }))
  }

  // ---- varanda: guarda-corpo de vidro, lounge, mesa de jantar e vasos
  {
    const v = varanda
    prims.push(box(v.w / 2, 0.03, v.w, 0.04, 1.0, C.glass, 0, { opacity: 0.22, noShadow: true }))
    prims.push(box(v.w / 2, 0.03, v.w, 0.07, 0.05, C.steel, 1.0, { noShadow: true }))
    for (const sx of [0.03, v.w - 0.03]) {
      prims.push(box(sx, v.h / 2, 0.04, v.h, 1.0, C.glass, 0, { opacity: 0.22, noShadow: true }))
      prims.push(box(sx, v.h / 2, 0.07, v.h, 0.05, C.steel, 1.0, { noShadow: true }))
    }
    prims.push(box(2.2, 1.0, 0.95, 2.2, 0.42, '#efe7d8', 0.05))
    prims.push(box(1.8, 1.55, 2.2, 0.8, 0.42, '#efe7d8', 0.05))
    prims.push(box(1.75, 0.45, 2.0, 0.22, 0.85, '#efe7d8', 0.05))
    prims.push(box(2.7, 1.2, 0.8, 0.8, 0.34, C.woodDark, 0.04))
    prims.push(box(3.7, 0.9, 0.8, 0.8, 0.4, '#e2d8c4', 0.05))
    const tx = Math.min(v.w - 2.2, v.w * 0.62)
    prims.push(...table(tx, 1.25, 1.5, 0.85, C.oak, 0.74))
    for (const k of [-0.4, 0.4]) {
      prims.push(...chair(tx + k, 1.25 - 0.65, 0, 1))
      prims.push(...chair(tx + k, 1.25 + 0.65, 0, -1))
    }
    prims.push(...plant(0.4, 0.4, 1.3))
    prims.push(...plant(v.w - 0.45, 0.45, 1.3))
    prims.push(...plant(v.w - 0.5, v.h - 0.4, 1.0))
    prims.push(...plant(tx - 1.4, 0.4, 1.0))
  }

  return { plan, prims, labels, center: [W / 2, 0.8, D / 2] }
}
