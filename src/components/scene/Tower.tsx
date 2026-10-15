import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { Color, ExtrudeGeometry, InstancedMesh, Matrix4, Object3D, Shape } from 'three'
import type { Unit } from '../../data/units'
import { createRng } from '../../lib/random'
import { UNITS_BY_ID } from '../../data/units'
import { useStore } from '../../store/useStore'
import {
  BALCONY_DEPTH,
  BASE_HEIGHT,
  CORE_DEPTH,
  CORE_WIDTH,
  FLOOR_HEIGHT,
  balconyGrid,
  balconySegments,
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
  /** anexo baixo com teto verde ao lado da torre */
  podium?: boolean
}

const CREAM = '#e6dfd0'
const CREAM_DARK = '#cfc6b3'
const CONCRETE = '#b7b2a8'
const COPPER = '#9c6b45'
const GREENS = ['#3f7d3a', '#4d8f43', '#5f9c4e', '#35692f', '#6aa858']
const FLOWERS = ['#d9468f', '#e8c63a', '#9b59b6', '#e8734a', '#f0a0c0']
const SLAB_Y = 0.075 // centro da laje da caixa (de 0,04 a 0,11)
const WALL_Y0 = 0.11 // base das paredes da caixa
const PARAPET_H = 0.4 // caixas altas e grossas: a fachada fica quase toda coberta, como no render
const WALL = 0.07

const dummy = new Object3D()
function mat(x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY = 0): Matrix4 {
  dummy.position.set(x, y, z)
  dummy.rotation.set(0, rotY, 0)
  dummy.scale.set(sx, sy, sz)
  dummy.updateMatrix()
  return dummy.matrix.clone()
}

interface Parts {
  balconySlab: Matrix4[]
  parapetFront: Matrix4[]
  parapetSide: Matrix4[]
  soil: Matrix4[]
  windowsLit: Matrix4[]
  windowsDark: Matrix4[]
  floorBands: Matrix4[]
  plants: Matrix4[]
  plantColors: Color[]
  flowers: Matrix4[]
  flowerColors: Color[]
}

/** Gera, de forma determinística, todas as peças repetidas da fachada (varandas, janelas, plantas). */
function buildParts(floors: number, seed: number): Parts {
  const rand = createRng(seed * 97 + 13)
  const p: Parts = {
    balconySlab: [],
    parapetFront: [],
    parapetSide: [],
    soil: [],
    windowsLit: [],
    windowsDark: [],
    floorBands: [],
    plants: [],
    plantColors: [],
    flowers: [],
    flowerColors: [],
  }
  const levels = towerLevels(floors, seed)

  /** varanda em caixa: laje + parapeito frontal + dois laterais, com jardineira. Centro e giro no mundo da torre. */
  const addBalcony = (cx: number, cy: number, cz: number, rot: number, w: number) => {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    // ponto no referencial da varanda -> torre
    const at = (lx: number, ly: number, lz: number): [number, number, number] => [
      cx + lx * c + lz * s,
      cy + ly,
      cz - lx * s + lz * c,
    ]
    const D = BALCONY_DEPTH
    p.balconySlab.push(mat(...at(0, SLAB_Y, 0), w, 0.07, D, rot))
    p.parapetFront.push(mat(...at(0, WALL_Y0 + PARAPET_H / 2, D / 2 - WALL / 2), w, PARAPET_H, WALL, rot))
    p.parapetSide.push(mat(...at(w / 2 - WALL / 2, WALL_Y0 + PARAPET_H / 2, 0), WALL, PARAPET_H, D, rot))
    p.parapetSide.push(mat(...at(-w / 2 + WALL / 2, WALL_Y0 + PARAPET_H / 2, 0), WALL, PARAPET_H, D, rot))
    // terra da jardineira: faz cada caixa ler como bandeja aberta
    p.soil.push(mat(...at(0, WALL_Y0 + PARAPET_H * 0.82, -WALL / 2), w - 2 * WALL, 0.03, D - WALL * 1.6, rot))
    if (rand() < 0.6) {
      const n = 1 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        const r = 0.05 + rand() * 0.06
        const lx = (rand() - 0.5) * (w - 0.2)
        const lz = (rand() - 0.5) * (D - 0.25)
        const [x, y, z] = at(lx, WALL_Y0 + PARAPET_H * 0.82 + r * 0.7, lz)
        p.plants.push(mat(x, y, z, r * 1.2, r, r * 1.2))
        p.plantColors.push(new Color(GREENS[Math.floor(rand() * GREENS.length)]))
        if (rand() < 0.5) {
          const fr = 0.022 + rand() * 0.02
          const [fx, fy, fz] = at(lx + (rand() - 0.5) * 0.1, WALL_Y0 + PARAPET_H * 0.82 + r * 1.5, lz)
          p.flowers.push(mat(fx, fy, fz, fr, fr, fr))
          p.flowerColors.push(new Color(FLOWERS[Math.floor(rand() * FLOWERS.length)]))
        }
      }
    }
  }

  for (let i = 0; i < floors; i++) {
    const floor = i + 1
    const y = levels[i].y
    p.floorBands.push(mat(0, y + 0.03, 0, CORE_WIDTH + 0.03, 0.06, CORE_DEPTH + 0.03))
    // fachadas longas: malha contínua de caixas (sem vão), deslocada meio passo nos andares ímpares
    for (const sg of balconySegments(CORE_WIDTH, floor)) {
      addBalcony(sg.x, y, CORE_DEPTH / 2 + BALCONY_DEPTH / 2, 0, sg.w)
      addBalcony(sg.x, y, -(CORE_DEPTH / 2 + BALCONY_DEPTH / 2), Math.PI, sg.w)
    }
    // empenas laterais (vista Oeste e Leste)
    for (const sign of [1, -1] as const) {
      for (const sg of balconySegments(CORE_DEPTH, floor)) {
        addBalcony(sign * (CORE_WIDTH / 2 + BALCONY_DEPTH / 2), y, sg.x, sign * (Math.PI / 2), sg.w)
      }
    }
    // frestas de janela no espaço livre entre uma fileira de caixas e a laje da seguinte
    const wy = y + 0.585
    const longPitch = balconyGrid(CORE_WIDTH).pitch
    const sidePitch = balconyGrid(CORE_DEPTH).pitch
    for (const sg of balconySegments(CORE_WIDTH, 0)) {
      for (const sign of [1, -1] as const) {
        const m = mat(sg.x, wy, sign * (CORE_DEPTH / 2 + 0.012), longPitch * 0.6, 0.1, 0.03, sign === 1 ? 0 : Math.PI)
        ;(rand() < 0.55 ? p.windowsLit : p.windowsDark).push(m)
      }
    }
    for (const sg of balconySegments(CORE_DEPTH, 0)) {
      for (const sign of [1, -1] as const) {
        const m = mat(sign * (CORE_WIDTH / 2 + 0.012), wy, sg.x, sidePitch * 0.6, 0.1, 0.03, sign * (Math.PI / 2))
        ;(rand() < 0.55 ? p.windowsLit : p.windowsDark).push(m)
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

/** Torre residencial de concreto claro, com varandas em caixa em padrão de tijolo, jardineiras e topo acobreado. */
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
    const far = (mx: Matrix4) => {
      const dx = mx.elements[12] + position[0] - eye[0]
      const dy = mx.elements[13] + position[1] - eye[1]
      const dz = mx.elements[14] + position[2] - eye[2]
      return dx * dx + dy * dy + dz * dz > 0.9 * 0.9
    }
    const keep = (m: Matrix4[], c: Color[]) => {
      const idx = m.map((x, i) => (far(x) ? i : -1)).filter((i) => i >= 0)
      return { m: idx.map((i) => m[i]), c: idx.map((i) => c[i]) }
    }
    const pl = keep(built.plants, built.plantColors)
    const fl = keep(built.flowers, built.flowerColors)
    return { ...built, plants: pl.m, plantColors: pl.c, flowers: fl.m, flowerColors: fl.c }
  }, [built, eye, position])
  const levels = useMemo(() => towerLevels(floors, seed), [floors, seed])

  const shaftHeight = floors * FLOOR_HEIGHT
  const core = useMemo(() => {
    const g = new ExtrudeGeometry(roundedRect(CORE_WIDTH, CORE_DEPTH, 0.2), { depth: shaftHeight, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    return g
  }, [shaftHeight])
  useLayoutEffect(() => () => core.dispose(), [core])

  const columns = useMemo(() => {
    const out: Matrix4[] = []
    for (let k = 0; k < 7; k++) {
      const x = -2.1 + k * 0.7
      out.push(mat(x, BASE_HEIGHT / 2, CORE_DEPTH / 2 + 0.12, 0.18, BASE_HEIGHT, 0.18))
      out.push(mat(x, BASE_HEIGHT / 2, -(CORE_DEPTH / 2 + 0.12), 0.18, BASE_HEIGHT, 0.18))
    }
    return out
  }, [])

  const crown = useMemo(() => {
    const fins: Matrix4[] = []
    for (let k = 0; k < 12; k++) {
      const x = -CORE_WIDTH / 2 + 0.2 + k * ((CORE_WIDTH - 0.4) / 11)
      const h = k % 2 === 0 ? 1.05 : 0.8
      fins.push(mat(x, BASE_HEIGHT + shaftHeight + h / 2, CORE_DEPTH / 2 - 0.08, 0.17, h, 0.22))
      fins.push(mat(x, BASE_HEIGHT + shaftHeight + h / 2, -(CORE_DEPTH / 2 - 0.08), 0.17, h, 0.22))
    }
    return fins
  }, [shaftHeight])

  const unitsByFloor = useMemo(() => {
    const map = new Map<number, Unit[]>()
    for (const u of units ?? []) map.set(u.floor, [...(map.get(u.floor) ?? []), u])
    return map
  }, [units])

  const top = BASE_HEIGHT + shaftHeight

  return (
    <group position={position}>
      {/* térreo: lobby de vidro com pilotis e marquise */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[CORE_WIDTH - 0.3, BASE_HEIGHT - 0.1, CORE_DEPTH - 0.3]} />
        <meshStandardMaterial color="#26303b" roughness={0.15} metalness={0.4} emissive="#ffcf8a" emissiveIntensity={night * 0.7} />
      </mesh>
      <Inst m={columns}>
        {box}
        <meshStandardMaterial color={CONCRETE} roughness={0.9} />
      </Inst>
      <mesh position={[0, BASE_HEIGHT - 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[CORE_WIDTH + 0.6, 0.08, CORE_DEPTH + 0.6]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>

      {/* fuste em concreto claro com cantos arredondados */}
      <mesh geometry={core} position={[0, BASE_HEIGHT, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </mesh>
      <Inst m={parts.floorBands} cast={false}>
        {box}
        <meshStandardMaterial color={CREAM_DARK} roughness={0.95} />
      </Inst>

      {/* varandas em caixa (tijolo deslocado a cada andar) */}
      <Inst m={parts.balconySlab}>
        {box}
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </Inst>
      <Inst m={parts.parapetFront}>
        {box}
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </Inst>
      <Inst m={parts.parapetSide}>
        {box}
        <meshStandardMaterial color={CREAM_DARK} roughness={0.95} />
      </Inst>

      <Inst m={parts.soil} cast={false}>
        {box}
        <meshStandardMaterial color="#3f4a35" roughness={1} />
      </Inst>

      {/* janelas: de noite parte delas acende */}
      <Inst m={parts.windowsDark} cast={false}>
        {box}
        <meshStandardMaterial color="#1f2a38" roughness={0.2} metalness={0.35} />
      </Inst>
      <Inst m={parts.windowsLit} cast={false}>
        {box}
        <meshStandardMaterial color="#1f2a38" roughness={0.2} metalness={0.35} emissive="#ffcf8a" emissiveIntensity={night * 1.4} />
      </Inst>

      {/* jardineiras */}
      <Inst m={parts.plants} colors={parts.plantColors}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
      </Inst>
      <Inst m={parts.flowers} colors={parts.flowerColors} cast={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} flatShading />
      </Inst>

      {/* topo: painéis acobreados entre aletas de concreto */}
      <mesh position={[0, top + 0.42, 0]} castShadow>
        <boxGeometry args={[CORE_WIDTH - 0.3, 0.84, CORE_DEPTH - 0.25]} />
        <meshStandardMaterial color={COPPER} roughness={0.55} metalness={0.25} emissive="#ffb070" emissiveIntensity={night * 0.5} />
      </mesh>
      <Inst m={crown}>
        {box}
        <meshStandardMaterial color={CREAM} roughness={0.95} />
      </Inst>
      <mesh position={[0, top + 0.88, 0]} castShadow>
        <boxGeometry args={[CORE_WIDTH - 0.5, 0.08, CORE_DEPTH - 0.4]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>

      {/* volumes translúcidos clicáveis das unidades */}
      {levels.map((l, i) =>
        unitsByFloor.has(i + 1) ? (
          <group key={i} position={[0, l.y, 0]}>
            <UnitSlabs units={unitsByFloor.get(i + 1)!} />
          </group>
        ) : null,
      )}

      {/* anexo baixo com teto verde e fachada de vidro */}
      {podium && (
        <group position={[-CORE_WIDTH / 2 - 1.7, 0, 0.9]}>
          <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.4, 0.72, 2.3]} />
            <meshStandardMaterial color={CREAM} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.34, 1.16]} castShadow>
            <boxGeometry args={[3.0, 0.52, 0.04]} />
            <meshStandardMaterial color="#26303b" roughness={0.15} metalness={0.4} emissive="#ffcf8a" emissiveIntensity={night * 0.8} />
          </mesh>
          <mesh position={[0, 0.745, 0]} receiveShadow>
            <boxGeometry args={[3.5, 0.06, 2.4]} />
            <meshStandardMaterial color="#5b9a4a" roughness={1} />
          </mesh>
        </group>
      )}
    </group>
  )
}
