import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { CanvasTexture, Color, DoubleSide, ExtrudeGeometry, InstancedMesh, Matrix4, Object3D, RepeatWrapping, Shape, SRGBColorSpace } from 'three'
import type { Unit } from '../../data/units'
import { UNITS_BY_ID } from '../../data/units'
import { createRng } from '../../lib/random'
import { useRoomEnv } from '../../lib/roomEnv'
import { useStore } from '../../store/useStore'
import {
  BALCONY_DEPTH,
  BASE_HEIGHT,
  CORE_DEPTH,
  CORE_WIDTH,
  FLOOR_HEIGHT,
  balconyGrid,
  facadeCells,
  towerLevels,
  unitWindowPose,
  type TowerConfig,
} from '../../lib/tower'
import { UnitSlabs } from './UnitSlabs'
import { FloorPlanLayer } from './FloorPlanLayer'

interface TowerProps extends Partial<TowerConfig> {
  /** 0 (dia) a 1 (noite): acende as janelas */
  night: number
  /** unidades à venda desta torre (opcional) */
  units?: Unit[]
  /** pódio largo e duplo na base (café, lobby, praça); só na torre principal */
  podium?: boolean
  /** andar em corte para mostrar as plantas dentro do prédio (null = prédio inteiro) */
  planFloor?: number | null
}

// materiais e cores (concreto claro, bronze, madeira, vidro escuro)
const CREAM = '#ddd2bc'
const CORE_WALL = '#cfc3aa'
const CREAM_DARK = '#c2b59b'
const CONCRETE = '#a9a8a2'
const BRONZE = '#4a3524'
const WOOD = '#8a5a32'
const GLASS = '#1f2a38'
/** vidro das janelas e portas da fachada: reflete o céu, mais claro que o vidro do pódio */
const PANE = '#4a6a86'
const RAIL = '#26292e'
const SOIL = '#3f4a35'
const GREENS = ['#3f7d3a', '#4d8f43', '#5f9c4e', '#35692f', '#6aa858']
const FLOWERS = ['#d9468f', '#e8c63a', '#9b59b6', '#e8734a', '#f0a0c0']

// bloco de varanda: laje inferior espessa, paredes grossas, topo aberto com guarda-corpo fino
// altura total do bloco = 49% do andar (duas reduções de 30%), para as portas de vidro aparecerem
const BLOCK_H = FLOOR_HEIGHT * 0.49
const SLAB_T = 0.1
const SLAB_Y = SLAB_T / 2
const WALL_Y0 = SLAB_T
const WALL_H = BLOCK_H - SLAB_T
const WALL = 0.07

// pódio largo e duplo
const POD_W = CORE_WIDTH + 2.6
const POD_D = CORE_DEPTH + 1.2

const dummy = new Object3D()
function matR(x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0): Matrix4 {
  dummy.position.set(x, y, z)
  dummy.rotation.set(rx, ry, rz)
  dummy.scale.set(sx, sy, sz)
  dummy.updateMatrix()
  return dummy.matrix.clone()
}
const mat = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY = 0) =>
  matR(x, y, z, sx, sy, sz, 0, rotY, 0)

interface Parts {
  slab: Matrix4[]
  wallFront: Matrix4[]
  wallSide: Matrix4[]
  railing: Matrix4[]
  soil: Matrix4[]
  windowsLit: Matrix4[]
  windowsDark: Matrix4[]
  frames: Matrix4[]
  floorBands: Matrix4[]
  plants: Matrix4[]
  plantColors: Color[]
  flowers: Matrix4[]
  flowerColors: Color[]
  cascade: Matrix4[]
  cascadeColors: Color[]
}

/** Gera, de forma determinística, todas as peças repetidas da fachada (blocos, janelas, plantas). */
function buildParts(floors: number, seed: number): Parts {
  const rand = createRng(seed * 97 + 13)
  const p: Parts = {
    slab: [],
    wallFront: [],
    wallSide: [],
    railing: [],
    soil: [],
    windowsLit: [],
    windowsDark: [],
    frames: [],
    floorBands: [],
    plants: [],
    plantColors: [],
    flowers: [],
    flowerColors: [],
    cascade: [],
    cascadeColors: [],
  }
  const levels = towerLevels(floors, seed)
  const D = BALCONY_DEPTH
  const longPitch = balconyGrid(CORE_WIDTH).pitch
  const sidePitch = balconyGrid(CORE_DEPTH).pitch

  /** bloco de varanda em balanço: centro e giro no mundo da torre. */
  const addBlock = (cx: number, cy: number, cz: number, rot: number, w: number) => {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const at = (lx: number, ly: number, lz: number): [number, number, number] => [
      cx + lx * c + lz * s,
      cy + ly,
      cz - lx * s + lz * c,
    ]
    p.slab.push(mat(...at(0, SLAB_Y, 0), w, SLAB_T, D, rot))
    p.wallFront.push(mat(...at(0, WALL_Y0 + WALL_H / 2, D / 2 - WALL / 2), w, WALL_H, WALL, rot))
    p.wallSide.push(mat(...at(w / 2 - WALL / 2, WALL_Y0 + WALL_H / 2, 0), WALL, WALL_H, D, rot))
    p.wallSide.push(mat(...at(-w / 2 + WALL / 2, WALL_Y0 + WALL_H / 2, 0), WALL, WALL_H, D, rot))
    // porta de vidro de correr da sala, na parede do núcleo, no fundo da varanda
    const [gx, gy, gz] = at(0, WALL_Y0 + 0.26, -D / 2 + 0.014)
    p.frames.push(mat(gx, gy, gz, w * 0.5 + 0.04, 0.42, 0.02, rot))
    ;(rand() < 0.55 ? p.windowsLit : p.windowsDark).push(mat(gx, gy, gz, w * 0.5, 0.38, 0.03, rot))
    const top = WALL_Y0 + WALL_H
    // guarda-corpo fino de metal escuro, recuado atrás da jardineira do parapeito
    p.railing.push(mat(...at(0, top + 0.07, D / 2 - 0.2), w - 0.04, 0.14, 0.012, rot))
    // jardineira no topo do parapeito, com arbustos e flores que transbordam pela frente
    p.soil.push(mat(...at(0, top + 0.025, D / 2 - 0.1), w - 0.1, 0.05, 0.16, rot))
    if (rand() < 0.75) {
      const n = 1 + Math.floor(rand() * 4)
      for (let k = 0; k < n; k++) {
        const r = 0.06 + rand() * 0.07
        const lx = (rand() - 0.5) * (w - 0.2)
        const lz = D / 2 - 0.1 + (rand() - 0.5) * 0.08
        const [x, y, z] = at(lx, top + 0.05 + r * 0.7, lz)
        p.plants.push(matR(x, y, z, r * 1.3, r, r * 1.3))
        p.plantColors.push(new Color(GREENS[Math.floor(rand() * GREENS.length)]))
        if (rand() < 0.75) {
          const fr = 0.026 + rand() * 0.024
          const [fx, fy, fz] = at(lx + (rand() - 0.5) * 0.12, top + 0.05 + r * 1.5, lz + (rand() - 0.3) * 0.05)
          p.flowers.push(mat(fx, fy, fz, fr, fr, fr))
          p.flowerColors.push(new Color(FLOWERS[Math.floor(rand() * FLOWERS.length)]))
        }
      }
    }
    // folhagem que cai pela frente do bloco
    if (rand() < 0.4) {
      const n = 1 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        const len = 0.12 + rand() * 0.18
        const lx = (rand() - 0.5) * (w - 0.14)
        p.cascade.push(mat(...at(lx, WALL_Y0 + WALL_H - len / 2 + 0.03, D / 2 + 0.012), 0.06 + rand() * 0.06, len, 0.03, rot))
        p.cascadeColors.push(new Color(GREENS[Math.floor(rand() * GREENS.length)]))
      }
    }
  }

  /** janela bem recuada, com moldura escura (quadro um pouco maior atrás do vidro). */
  const addWindow = (x: number, y: number, z: number, rot: number, w: number) => {
    const wy = y + WALL_Y0 + 0.27
    p.frames.push(mat(x, wy, z, w + 0.06, 0.42, 0.02, rot))
    ;(rand() < 0.55 ? p.windowsLit : p.windowsDark).push(mat(x, wy, z, w, 0.36, 0.03, rot))
    p.frames.push(mat(x, wy, z, 0.018, 0.38, 0.045, rot)) // montante central
    p.frames.push(mat(x, wy - 0.19, z, w + 0.08, 0.022, 0.05, rot)) // peitoril
  }

  for (let i = 0; i < floors; i++) {
    const floor = i + 1
    const y = levels[i].y
    p.floorBands.push(mat(0, y + 0.02, 0, CORE_WIDTH + 0.03, 0.04, CORE_DEPTH + 0.03))

    // fachadas longas (+z e -z): tabuleiro de blocos e janelas nas células vazias
    for (const cell of facadeCells(CORE_WIDTH, floor)) {
      for (const sign of [1, -1] as const) {
        const rot = sign === 1 ? 0 : Math.PI
        if (cell.block) addBlock(cell.x, y, sign * (CORE_DEPTH / 2 + D / 2), rot, longPitch)
        else addWindow(cell.x, y, sign * (CORE_DEPTH / 2 + 0.012), rot, longPitch * 0.42)
      }
    }
    // empenas laterais (+x e -x), mesma lógica
    for (const cell of facadeCells(CORE_DEPTH, floor)) {
      for (const sign of [1, -1] as const) {
        const rot = sign * (Math.PI / 2)
        if (cell.block) addBlock(sign * (CORE_WIDTH / 2 + D / 2), y, cell.x, rot, sidePitch)
        else addWindow(sign * (CORE_WIDTH / 2 + 0.012), y, cell.x, rot, sidePitch * 0.42)
      }
    }
  }
  return p
}

/** Malha instanciada: milhares de peças iguais em uma única chamada de desenho. */
function Inst({ m, colors, children, cast = true }: { m: Matrix4[]; colors?: Color[]; children: ReactNode; cast?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    m.forEach((x, i) => mesh.setMatrixAt(i, x))
    mesh.instanceMatrix.needsUpdate = true
    if (colors) {
      colors.forEach((c, i) => mesh.setColorAt(i, c))
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }, [m, colors])
  if (m.length === 0) return null
  return (
    <instancedMesh
      key={m.length}
      ref={ref}
      args={[undefined as never, undefined as never, m.length]}
      castShadow={cast}
      receiveShadow
      frustumCulled={false}
    >
      {children}
    </instancedMesh>
  )
}

const box = <boxGeometry args={[1, 1, 1]} />

/** Retângulo de cantos arredondados, no plano XY. */
function roundedRect(w: number, d: number, r: number) {
  const s = new Shape()
  const x = -w / 2
  const y = -d / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + d - r)
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
  s.lineTo(x + r, y + d)
  s.quadraticCurveTo(x, y + d, x, y + d - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Penthouse recuada no topo: vidro de piso a teto, caixilho de bronze e laje de cobertura plana. */
function Crown({ top, night }: { top: number; night: number }) {
  const env = useRoomEnv()
  const W = CORE_WIDTH - 1.1
  const Dp = CORE_DEPTH - 0.7
  const H = 0.78
  const mullions = useMemo(() => {
    const out: Matrix4[] = []
    const nx = Math.round(W / 0.62)
    for (let k = 0; k <= nx; k++) {
      const x = -W / 2 + (k * W) / nx
      out.push(mat(x, top + 0.08 + H / 2, Dp / 2, 0.05, H, 0.05))
      out.push(mat(x, top + 0.08 + H / 2, -Dp / 2, 0.05, H, 0.05))
    }
    const nz = Math.round(Dp / 0.62)
    for (let k = 1; k < nz; k++) {
      const z = -Dp / 2 + (k * Dp) / nz
      out.push(mat(W / 2, top + 0.08 + H / 2, z, 0.05, H, 0.05))
      out.push(mat(-W / 2, top + 0.08 + H / 2, z, 0.05, H, 0.05))
    }
    // travessa de bronze no meio dos vãos de vidro
    out.push(mat(0, top + 0.08 + H * 0.62, Dp / 2, W, 0.05, 0.06))
    out.push(mat(0, top + 0.08 + H * 0.62, -Dp / 2, W, 0.05, 0.06))
    out.push(mat(W / 2, top + 0.08 + H * 0.62, 0, 0.06, 0.05, Dp))
    out.push(mat(-W / 2, top + 0.08 + H * 0.62, 0, 0.06, 0.05, Dp))
    return out
  }, [W, Dp, top])
  // pilares de concreto que escalonam a coroa (como nos renders do topo)
  const piers = useMemo(() => {
    const out: Matrix4[] = []
    for (let k = 0; k <= 3; k++) {
      const x = -W / 2 + (k * W) / 3
      out.push(mat(x, top + 0.08 + (H + 0.12) / 2, Dp / 2 + 0.02, 0.3, H + 0.12, 0.34))
      out.push(mat(x, top + 0.08 + (H + 0.12) / 2, -Dp / 2 - 0.02, 0.3, H + 0.12, 0.34))
    }
    out.push(mat(W / 2 + 0.02, top + 0.08 + (H + 0.12) / 2, 0, 0.34, H + 0.12, 0.3))
    out.push(mat(-W / 2 - 0.02, top + 0.08 + (H + 0.12) / 2, 0, 0.34, H + 0.12, 0.3))
    return out
  }, [W, Dp, top])
  // guarda-corpo fino de metal escuro em volta do terraço
  const rails = useMemo(
    () => [
      mat(0, top + 0.13, CORE_DEPTH / 2 - 0.03, CORE_WIDTH - 0.1, 0.1, 0.014),
      mat(0, top + 0.13, -CORE_DEPTH / 2 + 0.03, CORE_WIDTH - 0.1, 0.1, 0.014),
      mat(CORE_WIDTH / 2 - 0.03, top + 0.13, 0, 0.014, 0.1, CORE_DEPTH - 0.1),
      mat(-CORE_WIDTH / 2 + 0.03, top + 0.13, 0, 0.014, 0.1, CORE_DEPTH - 0.1),
    ],
    [top],
  )
  return (
    <group>
      {/* terraço de cobertura (laje ocupa toda a planta) */}
      <mesh position={[0, top + 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[CORE_WIDTH, 0.08, CORE_DEPTH]} />
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </mesh>
      {/* caixa de vidro recuada */}
      <mesh position={[0, top + 0.08 + H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, Dp]} />
        <meshStandardMaterial color={GLASS} roughness={0.12} metalness={0.45} emissive="#ffcf8a" emissiveIntensity={night * 0.9} envMap={env} envMapIntensity={0.12 + 0.9 * (1 - night)} />
      </mesh>
      <Inst m={mullions}>
        {box}
        <meshStandardMaterial color={BRONZE} roughness={0.5} metalness={0.5} />
      </Inst>
      <Inst m={piers}>
        {box}
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </Inst>
      <Inst m={rails} cast={false}>
        {box}
        <meshStandardMaterial color={RAIL} roughness={0.5} metalness={0.4} />
      </Inst>
      {/* laje de cobertura plana, fascia escura de ripas de madeira */}
      <mesh position={[0, top + 0.08 + H + 0.05, 0]} castShadow>
        <boxGeometry args={[W + 0.5, 0.1, Dp + 0.5]} />
        <meshStandardMaterial color="#4a3425" roughness={0.75} />
      </mesh>
      <mesh position={[0, top + 0.08 + H + 0.115, 0]} castShadow>
        <boxGeometry args={[W + 0.5, 0.03, Dp + 0.5]} />
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </mesh>
      {/* casa de máquinas, condensadores e antena sobre a cobertura */}
      <mesh position={[1.5, top + 0.08 + H + 0.13 + 0.17, -0.3]} castShadow>
        <boxGeometry args={[1.1, 0.34, 0.8]} />
        <meshStandardMaterial color={CREAM_DARK} roughness={0.95} />
      </mesh>
      {[-1.9, -1.55, -1.2, -0.85].map((x) => (
        <mesh key={x} position={[x, top + 0.08 + H + 0.13 + 0.06, 0.55]} castShadow>
          <boxGeometry args={[0.28, 0.12, 0.22]} />
          <meshStandardMaterial color="#9ea3a8" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.2, top + 0.08 + H + 0.13 + 0.55, -0.6]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 6]} />
        <meshStandardMaterial color={RAIL} roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  )
}

/** Pódio largo e duplo: pilotis robustos, cortina de vidro com madeira, café, mesas, bananeiras e praça. */
function Podium({ night }: { night: number }) {
  const env = useRoomEnv()
  // piso de pedra da praça: textura com juntas, gerada no canvas
  const paving = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = '#cbc4b5'
    g.fillRect(0, 0, 64, 64)
    g.strokeStyle = '#a9a294'
    g.lineWidth = 3
    g.strokeRect(0, 0, 64, 64)
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.colorSpace = SRGBColorSpace
    t.repeat.set((POD_W + 1.8) / 0.7, (POD_D + 1.8) / 0.7)
    t.anisotropy = 4
    return t
  }, [])
  useLayoutEffect(() => () => paving.dispose(), [paving])
  const parts = useMemo(() => {
    const rand = createRng(4242)
    const mullions: Matrix4[] = []
    const gw = POD_W - 0.5
    const gd = POD_D - 0.7
    const nx = Math.round(gw / 0.33)
    for (let k = 0; k <= nx; k++) {
      const x = -gw / 2 + (k * gw) / nx
      mullions.push(mat(x, (BASE_HEIGHT - 0.12) / 2, gd / 2 + 0.01, 0.035, BASE_HEIGHT - 0.14, 0.035))
      mullions.push(mat(x, (BASE_HEIGHT - 0.12) / 2, -gd / 2 - 0.01, 0.035, BASE_HEIGHT - 0.14, 0.035))
    }
    const nz = Math.round(gd / 0.33)
    for (let k = 1; k < nz; k++) {
      const z = -gd / 2 + (k * gd) / nz
      mullions.push(mat(gw / 2 + 0.01, (BASE_HEIGHT - 0.12) / 2, z, 0.035, BASE_HEIGHT - 0.14, 0.035))
      mullions.push(mat(-gw / 2 - 0.01, (BASE_HEIGHT - 0.12) / 2, z, 0.035, BASE_HEIGHT - 0.14, 0.035))
    }
    // pilotis: colunas robustas de concreto aparente no perímetro
    const columns: Matrix4[] = []
    const cn = 6
    for (let k = 0; k < cn; k++) {
      const x = -POD_W / 2 + 0.25 + (k * (POD_W - 0.5)) / (cn - 1)
      columns.push(mat(x, BASE_HEIGHT / 2, POD_D / 2 - 0.2, 0.46, BASE_HEIGHT, 0.46))
      columns.push(mat(x, BASE_HEIGHT / 2, -(POD_D / 2 - 0.2), 0.46, BASE_HEIGHT, 0.46))
    }
    // mesas e cadeiras do café na praça
    const tables: Matrix4[] = []
    const chairs: Matrix4[] = []
    const tz = POD_D / 2 + 0.85
    for (let k = 0; k < 5; k++) {
      const x = -POD_W * 0.36 + k * POD_W * 0.18
      tables.push(matR(x, 0.055, tz, 1, 1, 1))
      chairs.push(mat(x - 0.2, 0.045, tz, 0.075, 0.09, 0.075))
      chairs.push(mat(x + 0.2, 0.045, tz, 0.075, 0.09, 0.075))
      chairs.push(mat(x, 0.045, tz + 0.2, 0.075, 0.09, 0.075))
    }
    // bananeiras: folhas longas e inclinadas em vasos
    const leaves: Matrix4[] = []
    const spots: [number, number][] = [
      [-POD_W / 2 - 0.1, POD_D / 2 + 0.2],
      [-1.4, POD_D / 2 + 0.45],
      [1.4, POD_D / 2 + 0.45],
      [POD_W / 2 + 0.1, POD_D / 2 + 0.2],
      [-POD_W / 2 - 0.1, -POD_D / 2 - 0.2],
      [POD_W / 2 + 0.1, -POD_D / 2 - 0.2],
    ]
    for (const [sx, sz] of spots) {
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * Math.PI * 2 + rand()
        const lean = 0.35 + rand() * 0.45
        const h = 0.35 + rand() * 0.3
        leaves.push(
          matR(
            sx + Math.cos(ang) * 0.05,
            h / 2 + 0.03,
            sz + Math.sin(ang) * 0.05,
            0.07,
            h,
            0.012,
            Math.sin(ang) * lean,
            ang,
            Math.cos(ang) * lean,
          ),
        )
      }
    }
    return { mullions, columns, tables, chairs, leaves }
  }, [])

  return (
    <group>
      {/* praça pavimentada */}
      <mesh position={[0, 0.006, 0.9]} receiveShadow>
        <boxGeometry args={[POD_W + 1.8, 0.03, POD_D + 1.8]} />
        <meshStandardMaterial map={paving} roughness={1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      {/* cortina de vidro do pódio (recuada atrás dos pilotis) */}
      <mesh position={[0, (BASE_HEIGHT - 0.12) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[POD_W - 0.5, BASE_HEIGHT - 0.12, POD_D - 0.7]} />
        <meshStandardMaterial color={GLASS} roughness={0.12} metalness={0.45} emissive="#ffcf8a" emissiveIntensity={night * 0.8} envMap={env} envMapIntensity={0.12 + 0.9 * (1 - night)} />
      </mesh>
      <Inst m={parts.mullions} cast={false}>
        {box}
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </Inst>
      <Inst m={parts.columns}>
        {box}
        <meshStandardMaterial color={CONCRETE} roughness={0.95} />
      </Inst>
      {/* cobertura verde do pódio */}
      <mesh position={[0, BASE_HEIGHT - 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[POD_W + 0.3, 0.12, POD_D + 0.3]} />
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </mesh>
      <mesh position={[0, BASE_HEIGHT + 0.012, 0]} receiveShadow>
        <boxGeometry args={[POD_W + 0.2, 0.03, POD_D + 0.2]} />
        <meshStandardMaterial color="#5b9a4a" roughness={1} />
      </mesh>
      {/* marquise de madeira sobre a entrada do lobby */}
      <mesh position={[0, BASE_HEIGHT - 0.28, POD_D / 2 + 0.2]} castShadow>
        <boxGeometry args={[2.6, 0.05, 0.9]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, (BASE_HEIGHT - 0.28) / 2, POD_D / 2 + 0.55]} castShadow>
          <boxGeometry args={[0.05, BASE_HEIGHT - 0.28, 0.05]} />
          <meshStandardMaterial color={BRONZE} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {/* café: mesas e cadeiras */}
      <Inst m={parts.tables}>
        <cylinderGeometry args={[0.1, 0.1, 0.11, 12]} />
        <meshStandardMaterial color="#2a2d31" roughness={0.6} />
      </Inst>
      <Inst m={parts.chairs}>
        {box}
        <meshStandardMaterial color="#9a6b3f" roughness={0.8} />
      </Inst>
      {/* bananeiras */}
      <Inst m={parts.leaves} cast={false}>
        {box}
        <meshStandardMaterial color="#4c9a3a" roughness={0.8} side={DoubleSide} />
      </Inst>
    </group>
  )
}

/** Torre residencial de concreto claro, com tabuleiro de blocos em balanço, penthouse recuada e pódio largo. */
export function Tower({ position = [0, 0, 0], rotation = 0, floors = 22, seed = 1, night, units, podium, planFloor = null }: TowerProps) {
  // vidros refletem um ambiente claro de dia e quase nada à noite
  const env = useRoomEnv()
  const refl = 0.12 + 0.9 * (1 - night)
  const built = useMemo(() => buildParts(floors, seed), [floors, seed])

  // na vista da varanda, some a vegetação colada na câmera para não tapar o panorama
  const viewMode = useStore((s) => s.viewMode)
  const selectedId = useStore((s) => s.selectedUnitId)
  const planUnitId = planFloor ? selectedId : null
  const eye = useMemo(() => {
    const unit = units && viewMode === 'windowView' && selectedId ? UNITS_BY_ID.get(selectedId) : undefined
    return unit ? unitWindowPose(unit, 'view1').position : null
  }, [units, viewMode, selectedId])
  const parts = useMemo(() => {
    if (!eye) return built
    // olho no espaço local da torre (desfaz posição e giro)
    const ex = eye[0] - position[0]
    const ez = eye[2] - position[2]
    const c = Math.cos(rotation)
    const sn = Math.sin(rotation)
    const lx = ex * c - ez * sn
    const lz = ex * sn + ez * c
    const near = (mx: Matrix4, r: number) => {
      const dx = mx.elements[12] - lx
      const dy = mx.elements[13] + position[1] - eye[1]
      const dz = mx.elements[14] - lz
      return dx * dx + dy * dy + dz * dz <= r * r
    }
    const dropNear = (m: Matrix4[], r: number) => m.filter((x) => !near(x, r))
    const keep = (m: Matrix4[], c: Color[], r: number) => {
      const idx = m.map((x, i) => (near(x, r) ? -1 : i)).filter((i) => i >= 0)
      return { m: idx.map((i) => m[i]), c: idx.map((i) => c[i]) }
    }
    const pl = keep(built.plants, built.plantColors, 0.9)
    const fl = keep(built.flowers, built.flowerColors, 0.9)
    const ca = keep(built.cascade, built.cascadeColors, 0.9)
    return {
      ...built,
      // do bloco do próprio apartamento some a frente (parede, guarda-corpo, terra) para liberar o panorama
      wallFront: dropNear(built.wallFront, 0.62),
      railing: dropNear(built.railing, 0.62),
      soil: dropNear(built.soil, 0.62),
      plants: pl.m,
      plantColors: pl.c,
      flowers: fl.m,
      flowerColors: fl.c,
      cascade: ca.m,
      cascadeColors: ca.c,
    }
  }, [built, eye, position, rotation])

  const levels = useMemo(() => towerLevels(floors, seed), [floors, seed])

  // corte no pavimento da planta: some tudo acima da laje do andar (blocos do próprio andar ficam)
  const cutY = planFloor ? levels[planFloor - 1]?.y ?? null : null
  const shown = useMemo(() => {
    if (cutY === null) return parts
    const below = (m: Matrix4[], lim: number) => m.filter((x) => x.elements[13] <= cutY + lim)
    const keepC = (m: Matrix4[], c: Color[], lim: number) => {
      const idx = m.map((x, i) => (x.elements[13] <= cutY + lim ? i : -1)).filter((i) => i >= 0)
      return { m: idx.map((i) => m[i]), c: idx.map((i) => c[i]) }
    }
    // no andar cortado as varandas ficam só com o piso: paredes, guarda-corpo e plantas saem,
    // e as lajes do andar de cima (que flutuariam) também
    const pl = keepC(parts.plants, parts.plantColors, -0.01)
    const fl = keepC(parts.flowers, parts.flowerColors, -0.01)
    const ca = keepC(parts.cascade, parts.cascadeColors, -0.01)
    return {
      ...parts,
      slab: below(parts.slab, 0.1),
      wallFront: below(parts.wallFront, -0.01),
      wallSide: below(parts.wallSide, -0.01),
      railing: below(parts.railing, -0.01),
      soil: below(parts.soil, -0.01),
      // janelas e portas do andar cortado ficariam soltas no ar
      windowsLit: below(parts.windowsLit, 0.05),
      windowsDark: below(parts.windowsDark, 0.05),
      frames: below(parts.frames, 0.05),
      floorBands: below(parts.floorBands, 0.05),
      plants: pl.m,
      plantColors: pl.c,
      flowers: fl.m,
      flowerColors: fl.c,
      cascade: ca.m,
      cascadeColors: ca.c,
    }
  }, [parts, cutY])
  const shaftHeight = floors * FLOOR_HEIGHT
  const core = useMemo(() => {
    const g = new ExtrudeGeometry(roundedRect(CORE_WIDTH, CORE_DEPTH, 0.14), { depth: shaftHeight, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    return g
  }, [shaftHeight])
  useLayoutEffect(() => () => core.dispose(), [core])

  // base simples das torres sem pódio: lobby de vidro e pilotis
  const baseColumns = useMemo(() => {
    const out: Matrix4[] = []
    for (let k = 0; k < 7; k++) {
      const x = -2.1 + k * 0.7
      out.push(mat(x, BASE_HEIGHT / 2, CORE_DEPTH / 2 + 0.12, 0.2, BASE_HEIGHT, 0.2))
      out.push(mat(x, BASE_HEIGHT / 2, -(CORE_DEPTH / 2 + 0.12), 0.2, BASE_HEIGHT, 0.2))
    }
    return out
  }, [])

  const unitsByFloor = useMemo(() => {
    const map = new Map<number, Unit[]>()
    for (const u of units ?? []) map.set(u.floor, [...(map.get(u.floor) ?? []), u])
    return map
  }, [units])

  const top = BASE_HEIGHT + shaftHeight

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {podium ? (
        <Podium night={night} />
      ) : (
        <>
          <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[CORE_WIDTH - 0.3, BASE_HEIGHT - 0.1, CORE_DEPTH - 0.3]} />
            <meshStandardMaterial color={GLASS} roughness={0.15} metalness={0.4} emissive="#ffcf8a" emissiveIntensity={night * 0.7} />
          </mesh>
          <Inst m={baseColumns}>
            {box}
            <meshStandardMaterial color={CONCRETE} roughness={0.95} />
          </Inst>
          <mesh position={[0, BASE_HEIGHT - 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[CORE_WIDTH + 0.6, 0.08, CORE_DEPTH + 0.6]} />
            <meshStandardMaterial color={CREAM} roughness={0.95} />
          </mesh>
        </>
      )}

      {/* fuste em concreto claro com cantos arredondados */}
      <mesh
        geometry={core}
        position={[0, BASE_HEIGHT, 0]}
        scale={[1, cutY === null ? 1 : Math.max(0.001, (cutY + 0.02 - BASE_HEIGHT) / shaftHeight), 1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={CORE_WALL} roughness={0.95} />
      </mesh>
      <Inst m={shown.floorBands} cast={false}>
        {box}
        <meshStandardMaterial color={CREAM_DARK} roughness={0.95} />
      </Inst>

      {/* blocos de varanda em balanço (tabuleiro) */}
      <Inst m={shown.slab}>
        {box}
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </Inst>
      <Inst m={shown.wallFront}>
        {box}
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </Inst>
      <Inst m={shown.wallSide}>
        {box}
        <meshStandardMaterial color={CREAM_DARK} roughness={0.95} />
      </Inst>
      <Inst m={shown.railing} cast={false}>
        {box}
        <meshStandardMaterial color={RAIL} roughness={0.5} metalness={0.4} />
      </Inst>
      <Inst m={shown.soil} cast={false}>
        {box}
        <meshStandardMaterial color={SOIL} roughness={1} />
      </Inst>

      {/* janelas recuadas com moldura escura; de noite parte delas acende */}
      <Inst m={shown.frames} cast={false}>
        {box}
        <meshStandardMaterial color="#2b2118" roughness={0.6} />
      </Inst>
      <Inst m={shown.windowsDark} cast={false}>
        {box}
        <meshStandardMaterial color={PANE} roughness={0.15} metalness={0.3} envMap={env} envMapIntensity={refl} />
      </Inst>
      <Inst m={shown.windowsLit} cast={false}>
        {box}
        <meshStandardMaterial color={PANE} roughness={0.15} metalness={0.3} emissive="#ffcf8a" emissiveIntensity={night * 1.5} envMap={env} envMapIntensity={refl} />
      </Inst>

      {/* jardineiras: arbustos, flores e folhagem caindo */}
      <Inst m={shown.plants} colors={shown.plantColors}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
      </Inst>
      <Inst m={shown.flowers} colors={shown.flowerColors} cast={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} flatShading />
      </Inst>
      <Inst m={shown.cascade} colors={shown.cascadeColors} cast={false}>
        {box}
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </Inst>

      {cutY === null && <Crown top={top} night={night} />}
      {cutY !== null && planFloor && unitsByFloor.has(planFloor) && (
        <group position={[0, cutY, 0]}>
          <FloorPlanLayer units={unitsByFloor.get(planFloor)!} selectedId={planUnitId} />
        </group>
      )}

      {/* volumes translúcidos clicáveis das unidades */}
      {levels.map((l, i) =>
        unitsByFloor.has(i + 1) ? (
          <group key={i} position={[0, l.y, 0]}>
            <UnitSlabs units={unitsByFloor.get(i + 1)!} />
          </group>
        ) : null,
      )}
    </group>
  )
}

