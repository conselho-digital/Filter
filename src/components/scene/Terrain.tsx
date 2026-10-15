import { Component, memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useLoader } from '@react-three/fiber'
import {
  CanvasTexture,
  Color,
  type InstancedMesh,
  MeshStandardMaterial,
  MirroredRepeatWrapping,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from 'three'
import { BUILDINGS, PHOTO, TREES, type BuildingRect } from '../../data/terrain'
import { createRng } from '../../lib/random'
import { FLOOR_HEIGHT } from '../../lib/tower'

/**
 * Terreno a partir da foto aérea do local: a foto cobre o chão, os prédios do entorno são
 * extrudados sobre as pegadas traçadas na foto e as árvores vêm da cor das copas.
 * A foto é girada 90° (o oeste, onde fica o mar, vai para -z) e a torre fica sobre o canteiro de obras.
 */

/** metros por pixel da foto (estimado pela largura das ruas) e unidades por metro (andar de 3 m = 0,62 un.) */
const M_PER_PX = 0.75
const UNIT_PER_M = FLOOR_HEIGHT / 3
export const S = M_PER_PX * UNIT_PER_M
/** pixel da foto onde fica o centro da torre (canteiro de obras) */
const U0 = 375
const V0 = 400

/** Pixel da foto -> mundo (x, z): norte da foto vira +x, leste vira +z, oeste (mar) vira -z. */
export function photoToWorld(u: number, v: number): [number, number] {
  return [-(v - V0) * S, (u - U0) * S]
}

const BAY = 0.66 // largura de um vão de janela (≈ 3,2 m)

/** Textura de fachada: parede clara com uma janela e uma laje por andar; e a máscara das janelas acesas. */
function makeFacadeTextures() {
  const size = 64
  const wall = document.createElement('canvas')
  wall.width = wall.height = size
  const g = wall.getContext('2d')!
  g.fillStyle = '#e3dccf'
  g.fillRect(0, 0, size, size)
  g.fillStyle = '#c9c0ae'
  g.fillRect(0, size - 6, size, 6)
  g.fillStyle = '#2f3b4a'
  g.fillRect(14, 10, 36, 34)
  g.fillStyle = '#5f7b94'
  g.fillRect(16, 12, 32, 14)
  g.fillStyle = '#7b8794'
  g.fillRect(8, 46, 48, 3)

  const glow = document.createElement('canvas')
  glow.width = glow.height = size
  const h = glow.getContext('2d')!
  h.fillStyle = '#000'
  h.fillRect(0, 0, size, size)
  h.fillStyle = '#ffcf8a'
  h.fillRect(16, 12, 32, 30)

  const mk = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    if (srgb) t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    return t
  }
  return { wall: mk(wall, true), glow: mk(glow, true) }
}

function roofTexture(base: string, speck: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = speck
  for (let i = 0; i < 40; i++) g.fillRect((i * 37) % 64, (i * 53) % 64, 4, 3)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** Prédio do entorno: caixa extrudada com fachada de janelas e telhado. */
const Building = memo(function Building({ b, wall, glow, roofFlat, roofTile, night }: {
  b: BuildingRect
  wall: CanvasTexture
  glow: CanvasTexture
  roofFlat: MeshStandardMaterial
  roofTile: MeshStandardMaterial
  night: number
}) {
  const mesh = useMemo(() => {
    const width = b.w * S
    const depth = b.d * S
    const height = b.floors * FLOOR_HEIGHT + b.seg * 0.004
    const a = (b.angle * Math.PI) / 180
    // direção do eixo local x no mundo: vetor (du, dv) da foto -> (-dv, du)
    const rotY = Math.atan2(-Math.cos(a), -Math.sin(a))
    const [x, z] = photoToWorld(b.u, b.v)

    const face = (len: number) => {
      const t = wall.clone()
      t.repeat.set(Math.max(1, Math.round(len / BAY)), b.floors)
      t.needsUpdate = true
      const e = glow.clone()
      e.repeat.copy(t.repeat)
      e.needsUpdate = true
      return new MeshStandardMaterial({ map: t, roughness: 0.9, emissive: new Color('#ffffff'), emissiveMap: e, emissiveIntensity: 0 })
    }
    const fx = face(depth) // faces ±x têm largura = profundidade
    const fz = face(width)
    const roof = b.roof === 'tile' ? roofTile : roofFlat
    return { x, z, rotY, width, depth, height, fx, fz, mats: [fx, fx, roof, roof, fz, fz] }
  }, [b, wall, glow, roofFlat, roofTile])

  useEffect(() => {
    mesh.fx.emissiveIntensity = night * 0.9
    mesh.fz.emissiveIntensity = night * 0.9
  }, [mesh, night])

  // libera as texturas clonadas e os materiais da fachada
  useEffect(
    () => () => {
      for (const m of [mesh.fx, mesh.fz]) {
        m.map?.dispose()
        m.emissiveMap?.dispose()
        m.dispose()
      }
    },
    [mesh],
  )

  return (
    <mesh position={[mesh.x, mesh.height / 2, mesh.z]} rotation={[0, mesh.rotY, 0]} castShadow receiveShadow material={mesh.mats}>
      <boxGeometry args={[mesh.width, mesh.height, mesh.depth]} />
    </mesh>
  )
})

/** Guindaste de obra ao lado da torre (o canteiro está em construção na foto). */
const Crane = memo(function Crane() {
  const [x, z] = photoToWorld(335, 345)
  const yellow = '#e3a21a'
  return (
    <group position={[x, 0, z]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 8.5, 0]} castShadow>
        <boxGeometry args={[0.16, 17, 0.16]} />
        <meshStandardMaterial color={yellow} roughness={0.6} />
      </mesh>
      <mesh position={[3.4, 17.3, 0]} castShadow>
        <boxGeometry args={[10.2, 0.16, 0.16]} />
        <meshStandardMaterial color={yellow} roughness={0.6} />
      </mesh>
      <mesh position={[-2.2, 17.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.5]} />
        <meshStandardMaterial color="#6e6a63" roughness={0.9} />
      </mesh>
      <mesh position={[0, 17.0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={yellow} roughness={0.6} />
      </mesh>
      <mesh position={[6.2, 15.4, 0]}>
        <boxGeometry args={[0.02, 3.3, 0.02]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  )
})

const dummy = new Object3D()

/** Árvores instanciadas (copa + tronco) nas posições detectadas na foto. */
const Trees = memo(function Trees() {
  const crowns = useRef<InstancedMesh>(null)
  const trunks = useRef<InstancedMesh>(null)
  const items = useMemo(() => {
    const rand = createRng(77)
    return TREES.map(([u, v]) => {
      const [x, z] = photoToWorld(u, v)
      return { x, z, k: 0.8 + rand() * 0.6, tone: rand() }
    })
  }, [])
  useLayoutEffect(() => {
    const c = crowns.current
    const t = trunks.current
    if (!c || !t) return
    const dark = new Color('#2f6a2c')
    const light = new Color('#5c9a45')
    items.forEach((it, i) => {
      dummy.rotation.set(0, it.x * 7, 0)
      dummy.position.set(it.x, 0.22 * it.k, it.z)
      dummy.scale.set(0.05, 0.44 * it.k, 0.05)
      dummy.updateMatrix()
      t.setMatrixAt(i, dummy.matrix)
      dummy.position.set(it.x, 0.78 * it.k, it.z)
      dummy.scale.set(0.55 * it.k, 0.5 * it.k, 0.55 * it.k)
      dummy.updateMatrix()
      c.setMatrixAt(i, dummy.matrix)
      c.setColorAt(i, dark.clone().lerp(light, it.tone))
    })
    c.instanceMatrix.needsUpdate = true
    t.instanceMatrix.needsUpdate = true
    if (c.instanceColor) c.instanceColor.needsUpdate = true
  }, [items])
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined as never, undefined as never, items.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#5b4636" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined as never, undefined as never, items.length]} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} flatShading />
      </instancedMesh>
    </>
  )
})

/** Chão liso de reserva se a foto não carregar. */
function FallbackGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 253]} receiveShadow>
      <planeGeometry args={[1600, 700]} />
      <meshStandardMaterial color="#8d9279" roughness={1} />
    </mesh>
  )
}

/** Se a foto falhar (404, rede), o resto da cena segue sem derrubar o app. */
class PhotoBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const PHOTO_URL = PHOTO.src.replace(/^\//, import.meta.env.BASE_URL)

/** Terreno realista: foto aérea no chão, prédios 3D do entorno, árvores e guindaste. */
export function Terrain({ night }: { night: number }) {
  return (
    <group>
      <PhotoBoundary fallback={<FallbackGround />}>
        <Suspense fallback={<FallbackGround />}>
          <PhotoGround night={night} />
        </Suspense>
      </PhotoBoundary>
      <Surroundings night={night} />
    </group>
  )
}

/** Chão com a foto aérea. */
function PhotoGround({ night }: { night: number }) {
  const photo = useLoader(TextureLoader, PHOTO_URL)
  useLayoutEffect(() => {
    photo.wrapS = photo.wrapT = MirroredRepeatWrapping
    photo.colorSpace = SRGBColorSpace
    photo.anisotropy = 8
    photo.needsUpdate = true
  }, [photo])

  // chão: UVs calculados do mapeamento foto -> mundo (a foto vira 90° e espelha nas bordas, sem emendas)
  const ground = useMemo(() => {
    const g = new PlaneGeometry(1600, 700, 8, 4)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, 253)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const u = U0 + z / S
      const v = V0 - x / S
      uv.setXY(i, u / PHOTO.width, 1 - v / PHOTO.height)
    }
    uv.needsUpdate = true
    return g
  }, [])
  useLayoutEffect(() => () => ground.dispose(), [ground])

  const groundTint = useMemo(() => new Color('#ffffff').lerp(new Color('#4f5d7c'), night * 0.75), [night])

  return (
    <mesh geometry={ground} receiveShadow>
      <meshStandardMaterial map={photo} color={groundTint} roughness={1} />
    </mesh>
  )
}

/** Prédios do entorno, árvores e guindaste. */
function Surroundings({ night }: { night: number }) {
  const facade = useMemo(makeFacadeTextures, [])
  const roofFlat = useMemo(() => new MeshStandardMaterial({ map: roofTexture('#8f8b83', '#77736b'), roughness: 0.95 }), [])
  const roofTile = useMemo(() => new MeshStandardMaterial({ map: roofTexture('#b0623f', '#8f4c30'), roughness: 0.9 }), [])
  useEffect(
    () => () => {
      facade.wall.dispose()
      facade.glow.dispose()
      for (const m of [roofFlat, roofTile]) {
        m.map?.dispose()
        m.dispose()
      }
    },
    [facade, roofFlat, roofTile],
  )
  return (
    <group>
      {BUILDINGS.map((b, i) => (
        <Building key={i} b={b} wall={facade.wall} glow={facade.glow} roofFlat={roofFlat} roofTile={roofTile} night={night} />
      ))}
      <Trees />
      <Crane />
    </group>
  )
}
