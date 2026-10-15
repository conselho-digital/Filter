import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { Color, DoubleSide, ExtrudeGeometry, InstancedMesh, Matrix4, Object3D, Shape } from 'three'
import type { Unit } from '../../data/units'
import { UNITS_BY_ID } from '../../data/units'
import { createRng } from '../../lib/random'
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

interface TowerProps extends Partial<TowerConfig> {
  /** 0 (dia) a 1 (noite): acende as janelas */
  night: number
  /** unidades à venda desta torre (opcional) */
  units?: Unit[]
  /** pódio largo e duplo na base (café, lobby, praça); só na torre principal */
  podium?: boolean
}

// materiais e cores (concreto claro, bronze, madeira, vidro escuro)
const CREAM = '#e9e3d6'
const CORE_WALL = '#d6cebd'
const CREAM_DARK = '#cfc6b3'
const CONCRETE = '#b3aea4'
const BRONZE = '#8b6a45'
const WOOD = '#8a5a32'
const GLASS = '#1f2a38'
const RAIL = '#26292e'
const SOIL = '#3f4a35'
const GREENS = ['#3f7d3a', '#4d8f43', '#5f9c4e', '#35692f', '#6aa858']
const FLOWERS = ['#d9468f', '#e8c63a', '#9b59b6', '#e8734a', '#f0a0c0']

// bloco de varanda: laje inferior espessa, paredes grossas, topo aberto com guarda-corpo fino
const SLAB_Y = 0.07 // centro da laje (de 0,02 a 0,12)
const WALL_Y0 = 0.12 // base das paredes
const WALL_H = 0.45 // altura das paredes (topo em 0,57)
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
    p.slab.push(mat(...at(0, SLAB_Y, 0), w, 0.1, D, rot))
    p.wallFront.push(mat(...at(0, WALL_Y0 + WALL_H / 2, D / 2 - WALL / 2), w, WALL_H, WALL, rot))
    p.wallSide.push(mat(...at(w / 2 - WALL / 2, WALL_Y0 + WALL_H / 2, 0), WALL, WALL_H, D, rot))
    p.wallSide.push(mat(...at(-w / 2 + WALL / 2, WALL_Y0 + WALL_H / 2, 0), WALL, WALL_H, D, rot))
    // guarda-corpo fino de metal escuro no topo da parede frontal
    p.railing.push(mat(...at(0, WALL_Y0 + WALL_H + 0.035, D / 2 - 0.012), w - 0.02, 0.07, 0.014, rot))
    // terra da jardineira
    p.soil.push(mat(...at(0, WALL_Y0 + 0.03, D / 2 - WALL - 0.09), w - 2 * WALL, 0.06, 0.16, rot))
    if (rand() < 0.6) {
      const n = 1 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        const r = 0.05 + rand() * 0.06
        const lx = (rand() - 0.5) * (w - 0.2)
        const lz = D / 2 - WALL - 0.09 + (rand() - 0.5) * 0.08
        const [x, y, z] = at(lx, WALL_Y0 + 0.06 + r * 0.7, lz)
        p.plants.push(matR(x, y, z, r * 1.2, r, r * 1.2))
        p.plantColors.push(new Color(GREENS[Math.floor(rand() * GREENS.length)]))
        if (rand() < 0.5) {
          const fr = 0.022 + rand() * 0.02
          const [fx, fy, fz] = at(lx + (rand() - 0.5) * 0.1, WALL_Y0 + 0.06 + r * 1.5, lz)
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
        p.cascade.push(mat(...at(lx, WALL_Y0 + WALL_H - len / 2 + 0.03, D / 2 + 0.012), 0.05 + rand() * 0.05, len, 0.025, rot))
        p.cascadeColors.push(new Color(GREENS[Math.floor(rand() * GREENS.length)]))
      }
    }
  }

  /** janela bem recuada, com moldura escura (quadro um pouco maior atrás do vidro). */
  const addWindow = (x: number, y: number, z: number, rot: number, w: number) => {
    const wy = y + WALL_Y0 + 0.27
    p.frames.push(mat(x, wy, z, w + 0.05, 0.36, 0.02, rot))
    ;(rand() < 0.55 ? p.windowsLit : p.windowsDark).push(mat(x, wy, z, w, 0.3, 0.03, rot))
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
        else addWindow(cell.x, y, sign * (CORE_DEPTH / 2 + 0.012), rot, longPitch * 0.55)
      }
    }
    // empenas laterais (+x e -x), mesma lógica
    for (const cell of facadeCells(CORE_DEPTH, floor)) {
      for (const sign of [1, -1] as const) {
        const rot = sign * (Math.PI / 2)
        if (cell.block) addBlock(sign * (CORE_WIDTH / 2 + D / 2), y, cell.x, rot, sidePitch)
        else addWindow(sign * (CORE_WIDTH / 2 + 0.012), y, cell.x, rot, sidePitch * 0.55)
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
  const W = CORE_WIDTH - 1.1
  const Dp = CORE_DEPTH - 0.7
  const H = 0.78
  const mullions = useMemo(() => {
    const out: Matrix4[] = []
    const nx = Math.round(W / 0.32)
    for (let k = 0; k <= nx; k++) {
      const x = -W / 2 + (k * W) / nx
      out.push(mat(x, top + 0.08 + H / 2, Dp / 2, 0.04, H, 0.04))
      out.push(mat(x, top + 0.08 + H / 2, -Dp / 2, 0.04, H, 0.04))
    }
    const nz = Math.round(Dp / 0.32)
    for (let k = 1; k < nz; k++) {
      const z = -Dp / 2 + (k * Dp) / nz
      out.push(mat(W / 2, top + 0.08 + H / 2, z, 0.04, H, 0.04))
      out.push(mat(-W / 2, top + 0.08 + H / 2, z, 0.04, H, 0.04))
    }
    return out
  }, [W, Dp, top])
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
        <meshStandardMaterial color={GLASS} roughness={0.12} metalness={0.45} emissive="#ffcf8a" emissiveIntensity={night * 0.9} />
      </mesh>
      <Inst m={mullions}>
        {box}
        <meshStandardMaterial color={BRONZE} roughness={0.5} metalness={0.5} />
      </Inst>
      {/* laje de cobertura plana com fachada de madeira */}
      <mesh position={[0, top + 0.08 + H + 0.05, 0]} castShadow>
        <boxGeometry args={[W + 0.5, 0.1, Dp + 0.5]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      <mesh position={[0, top + 0.08 + H + 0.115, 0]} castShadow>
        <boxGeometry args={[W + 0.5, 0.03, Dp + 0.5]} />
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </mesh>
    </group>
  )
}

/** Pódio largo e duplo: pilotis robustos, cortina de vidro com madeira, café, mesas, bananeiras e praça. */
function Podium({ night }: { night: number }) {
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
    const cn = 8
    for (let k = 0; k < cn; k++) {
      const x = -POD_W / 2 + 0.15 + (k * (POD_W - 0.3)) / (cn - 1)
      columns.push(mat(x, BASE_HEIGHT / 2, POD_D / 2 - 0.15, 0.3, BASE_HEIGHT, 0.3))
      columns.push(mat(x, BASE_HEIGHT / 2, -(POD_D / 2 - 0.15), 0.3, BASE_HEIGHT, 0.3))
    }
    // mesas e cadeiras do café na praça
    const tables: Matrix4[] = []
    const chairs: Matrix4[] = []
    const tz = POD_D / 2 + 0.85
    for (let k = 0; k < 5; k++) {
      const x = -2.6 + k * 1.3
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
        <boxGeometry args={[POD_W + 4.5, 0.012, POD_D + 3.4]} />
        <meshStandardMaterial color="#cdc7bb" roughness={1} />
      </mesh>
      {/* cortina de vidro do pódio (recuada atrás dos pilotis) */}
      <mesh position={[0, (BASE_HEIGHT - 0.12) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[POD_W - 0.5, BASE_HEIGHT - 0.12, POD_D - 0.7]} />
        <meshStandardMaterial color={GLASS} roughness={0.12} metalness={0.45} emissive="#ffcf8a" emissiveIntensity={night * 0.8} />
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
export function Tower({ position = [0, 0, 0], floors = 22, seed = 1, night, units, podium }: TowerProps) {
  const built = useMemo(() => buildParts(floors, seed), [floors, seed])

  // na vista da varanda, some a vegetação colada na câmera para não tapar o panorama
  const viewMode = useStore((s) => s.viewMode)
  const selectedId = useStore((s) => s.selectedUnitId)
  const eye = useMemo(() => {
    const unit = units && viewMode === 'windowView' && selectedId ? UNITS_BY_ID.get(selectedId) : undefined
    return unit ? unitWindowPose(unit, 'view1').position : null
  }, [units, viewMode, selectedId])
  const parts = useMemo(() => {
    if (!eye) return built
    const near = (mx: Matrix4, r: number) => {
      const dx = mx.elements[12] + position[0] - eye[0]
      const dy = mx.elements[13] + position[1] - eye[1]
      const dz = mx.elements[14] + position[2] - eye[2]
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
  }, [built, eye, position])

  const levels = useMemo(() => towerLevels(floors, seed), [floors, seed])
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
    <group position={position}>
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
      <mesh geometry={core} position={[0, BASE_HEIGHT, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={CORE_WALL} roughness={0.95} />
      </mesh>
      <Inst m={parts.floorBands} cast={false}>
        {box}
        <meshStandardMaterial color={CREAM_DARK} roughness={0.95} />
      </Inst>

      {/* blocos de varanda em balanço (tabuleiro) */}
      <Inst m={parts.slab}>
        {box}
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </Inst>
      <Inst m={parts.wallFront}>
        {box}
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </Inst>
      <Inst m={parts.wallSide}>
        {box}
        <meshStandardMaterial color={CREAM_DARK} roughness={0.95} />
      </Inst>
      <Inst m={parts.railing} cast={false}>
        {box}
        <meshStandardMaterial color={RAIL} roughness={0.5} metalness={0.4} />
      </Inst>
      <Inst m={parts.soil} cast={false}>
        {box}
        <meshStandardMaterial color={SOIL} roughness={1} />
      </Inst>

      {/* janelas recuadas com moldura escura; de noite parte delas acende */}
      <Inst m={parts.frames} cast={false}>
        {box}
        <meshStandardMaterial color="#14181e" roughness={0.6} />
      </Inst>
      <Inst m={parts.windowsDark} cast={false}>
        {box}
        <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.35} />
      </Inst>
      <Inst m={parts.windowsLit} cast={false}>
        {box}
        <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.35} emissive="#ffcf8a" emissiveIntensity={night * 1.5} />
      </Inst>

      {/* jardineiras: arbustos, flores e folhagem caindo */}
      <Inst m={parts.plants} colors={parts.plantColors}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
      </Inst>
      <Inst m={parts.flowers} colors={parts.flowerColors} cast={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} flatShading />
      </Inst>
      <Inst m={parts.cascade} colors={parts.cascadeColors} cast={false}>
        {box}
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </Inst>

      <Crown top={top} night={night} />

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

