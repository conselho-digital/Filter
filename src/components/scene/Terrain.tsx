import { Component, memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useLoader } from '@react-three/fiber'
import {
  BoxGeometry,
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
  type WebGLProgramParametersWithUniforms,
} from 'three'
import { BUILDINGS, PHOTO, SEA_TILE, TOWER_PIXEL, TREES } from '../../data/terrain'
import { createRng } from '../../lib/random'
import { FLOOR_HEIGHT } from '../../lib/tower'

/**
 * Bairro a partir da foto da maquete do local: a foto cobre o chão, os prédios são extrudados sobre as
 * pegadas detectadas na foto (telhado com a cor da foto) e as árvores vêm da cor das copas.
 * A foto é girada para a avenida beira-mar ficar paralela ao eixo x (o mar vai para -z) e a torre fica no
 * ponto marcado pelo dono (foguete). Fora da foto, a imagem se repete espelhada (prédios inclusive).
 */

/** metros por pixel da foto (estimado pelo tamanho das casas e ruas) e unidades por metro (andar de 3 m = 0,62 un.) */
const M_PER_PX = 0.6
const UNIT_PER_M = FLOOR_HEIGHT / 3
export const S = M_PER_PX * UNIT_PER_M
/** giro (rad) que deixa a avenida beira-mar paralela ao eixo x do mundo */
export const ALPHA = (27 * Math.PI) / 180
const COS = Math.cos(ALPHA)
const SIN = Math.sin(ALPHA)
const { width: PW, height: PH } = PHOTO
/** abaixo desta linha (px) a borda esquerda da foto é mar aberto; acima dela é praia e cidade */
const SEA_FROM_V = 560

/** Pixel da foto -> mundo (x, z): o mar (esquerda da foto) vai para -z. */
export function photoToWorld(u: number, v: number): [number, number] {
  const du = u - TOWER_PIXEL.u
  const dv = v - TOWER_PIXEL.v
  return [-(SIN * du + COS * dv) * S, (COS * du - SIN * dv) * S]
}

const BAY = 0.66 // largura de um vão de janela (≈ 3,2 m)

/** Textura de fachada: parede clara com uma janela por vão e andar; e a máscara das janelas acesas. */
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

  const mk = (c: HTMLCanvasElement) => {
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    return t
  }
  return { wall: mk(wall), glow: mk(glow) }
}

const dummy = new Object3D()
const roofColor = new Color()

interface Placed {
  u: number
  v: number
  angle: number
}

/** Posições (u, v, ângulo) de um item da foto em cada cópia espelhada. */
function tilesFor(u: number, v: number, angle: number): Placed[] {
  const out: Placed[] = []
  const add = (uu: number, vv: number, a: number) => {
    if (uu < 0 && vv > SEA_FROM_V - 20) return // seria sobre o mar
    out.push({ u: uu, v: vv, angle: a })
  }
  add(u, v, angle)
  // espelho na borda direita (u = PW)
  add(2 * PW - u, v, 180 - angle)
  add(2 * PW - u, -v, 180 + angle)
  add(2 * PW - u, 2 * PH - v, 180 + angle)
  // espelho no topo e na base
  add(u, -v, -angle)
  add(u, 2 * PH - v, -angle)
  // espelho na borda esquerda (u = 0): só a faixa de cidade/praia
  add(-u, v, 180 - angle)
  add(-u, -v, 180 + angle)
  return out
}
/** Todos os prédios do bairro numa malha instanciada: parede com janelas (UV por metro) e telhado na cor da foto. */
const Houses = memo(function Houses({ night }: { night: number }) {
  const mesh = useRef<InstancedMesh>(null)
  const shader = useRef<WebGLProgramParametersWithUniforms | null>(null)
  const facade = useMemo(makeFacadeTextures, [])
  const geo = useMemo(() => new BoxGeometry(1, 1, 1), [])

  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ roughness: 0.9 })
    m.onBeforeCompile = (sh) => {
      sh.uniforms.wallMap = { value: facade.wall }
      sh.uniforms.glowMap = { value: facade.glow }
      sh.uniforms.uNight = { value: (m.userData.night as number | undefined) ?? 0 }
      shader.current = sh
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nvarying vec2 vFacUv;\nvarying float vTop;`)
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#else
  vec3 sc = vec3(1.0);
#endif
  vTop = step(0.5, normal.y);
  float along = abs(normal.x) > 0.5 ? position.z * sc.z : position.x * sc.x;
  vFacUv = vec2(along / ${BAY.toFixed(3)} + 0.5, (position.y + 0.5) * sc.y / ${FLOOR_HEIGHT.toFixed(3)});`,
        )
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nuniform sampler2D wallMap;\nuniform sampler2D glowMap;\nuniform float uNight;\nvarying vec2 vFacUv;\nvarying float vTop;`,
        )
        .replace('#include <map_fragment>', 'diffuseColor.rgb = mix(texture2D(wallMap, vFacUv).rgb, vColor.rgb, vTop);')
        .replace('#include <color_fragment>', '')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * texture2D(glowMap, vFacUv).r * uNight * 0.9 * (1.0 - vTop);`,
        )
    }
    m.customProgramCacheKey = () => 'terrain-houses'
    return m
  }, [facade])

  const items = useMemo(() => {
    const rand = createRng(31)
    const list: { x: number; z: number; rot: number; w: number; d: number; h: number; color: number }[] = []
    for (const [u, v, w, d, a, floors, color] of BUILDINGS) {
      const scale = 0.92 // as pegadas detectadas incluem um pouco de beiral
      const h = floors * FLOOR_HEIGHT + rand() * 0.05
      for (const t of tilesFor(u, v, a)) {
        const [x, z] = photoToWorld(t.u, t.v)
        const ar = (t.angle * Math.PI) / 180 + ALPHA
        list.push({ x, z, rot: Math.atan2(-Math.cos(ar), -Math.sin(ar)), w: w * S * scale, d: d * S * scale, h, color })
      }
    }
    return list
  }, [])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.h / 2, it.z)
      dummy.rotation.set(0, it.rot, 0)
      dummy.scale.set(it.w, it.h, it.d)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      // o telhado sai mais escuro que o pixel da foto (a foto já tem luz e sombra)
      m.setColorAt(i, roofColor.setHex(it.color).multiplyScalar(0.85))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [items])

  useEffect(() => {
    material.userData.night = night
    if (shader.current) shader.current.uniforms.uNight.value = night
  }, [night, material])

  useEffect(
    () => () => {
      facade.wall.dispose()
      facade.glow.dispose()
      material.dispose()
      geo.dispose()
    },
    [facade, material, geo],
  )

  return <instancedMesh ref={mesh} args={[geo, material, items.length]} castShadow receiveShadow frustumCulled={false} />
})

/** Árvores instanciadas (copa + tronco) nas posições detectadas na foto. */
const Trees = memo(function Trees() {
  const crowns = useRef<InstancedMesh>(null)
  const trunks = useRef<InstancedMesh>(null)
  const items = useMemo(() => {
    const rand = createRng(77)
    const list: { x: number; z: number; k: number; tone: number }[] = []
    for (const [u, v, r] of TREES) {
      for (const t of tilesFor(u, v, 0)) {
        const [x, z] = photoToWorld(t.u, t.v)
        list.push({ x, z, k: Math.min(1.5, 0.7 + r * 0.09) * (0.85 + rand() * 0.3), tone: rand() })
      }
    }
    return list
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
      dummy.scale.set(0.5 * it.k, 0.46 * it.k, 0.5 * it.k)
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
const SEA_URL = SEA_TILE.src.replace(/^\//, import.meta.env.BASE_URL)

/** Chão com a foto, a imagem espelhada ao redor e o mar aberto à esquerda da foto. */
function PhotoGround({ night }: { night: number }) {
  const [photo, seaMap] = useLoader(TextureLoader, [PHOTO_URL, SEA_URL])
  useLayoutEffect(() => {
    photo.wrapS = photo.wrapT = MirroredRepeatWrapping
    photo.colorSpace = SRGBColorSpace
    photo.anisotropy = 8
    photo.needsUpdate = true
    // mar além da borda: o trecho de mar da foto, repetido espelhado na mesma escala
    seaMap.wrapS = seaMap.wrapT = MirroredRepeatWrapping
    seaMap.colorSpace = SRGBColorSpace
    seaMap.anisotropy = 8
    seaMap.repeat.set(2500 / (SEA_TILE.width * S), 4000 / (SEA_TILE.height * S))
    seaMap.needsUpdate = true
  }, [photo, seaMap])

  const pw = PW * S
  const ph = PH * S
  const photoGeo = useMemo(() => new PlaneGeometry(pw, ph).rotateX(-Math.PI / 2), [pw, ph])
  // plano grande com a foto espelhada (UV linear a partir da posição)
  const outerGeo = useMemo(() => {
    const g = new PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / pw + 0.5, 0.5 - pos.getZ(i) / ph)
    uv.needsUpdate = true
    return g
  }, [pw, ph])
  const seaGeo = useMemo(() => new PlaneGeometry(2500, 4000).rotateX(-Math.PI / 2), [])
  useLayoutEffect(
    () => () => {
      photoGeo.dispose()
      outerGeo.dispose()
      seaGeo.dispose()
    },
    [photoGeo, outerGeo, seaGeo],
  )

  const tint = useMemo(() => new Color('#ffffff').lerp(new Color('#4f5d7c'), night * 0.75), [night])
  const [cx, cz] = photoToWorld(PW / 2, PH / 2)
  const seaZ = (SEA_FROM_V - PH / 2) * S

  return (
    <group position={[cx, 0, cz]} rotation={[0, -Math.PI / 2 - ALPHA, 0]}>
      <mesh geometry={photoGeo} receiveShadow>
        <meshStandardMaterial map={photo} color={tint} roughness={1} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
      </mesh>
      <mesh geometry={outerGeo} position={[0, -0.05, 0]} receiveShadow>
        <meshStandardMaterial map={photo} color={tint} roughness={1} />
      </mesh>
      <mesh geometry={seaGeo} position={[-pw / 2 - 1250, -0.025, seaZ + 2000]}>
        <meshStandardMaterial map={seaMap} color={tint} roughness={1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
    </group>
  )
}

/** Terreno realista: foto do bairro no chão, prédios 3D e árvores. */
export function Terrain({ night }: { night: number }) {
  return (
    <group>
      <PhotoBoundary fallback={<FallbackGround />}>
        <Suspense fallback={<FallbackGround />}>
          <PhotoGround night={night} />
        </Suspense>
      </PhotoBoundary>
      <Houses night={night} />
      <Trees />
    </group>
  )
}
