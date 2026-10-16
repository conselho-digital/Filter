import { useThree } from '@react-three/fiber'
import { PMREMGenerator, type Texture, type WebGLRenderer } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Ambiente de reflexo gerado no próprio código (sem HDR externo), uma vez por renderer. */
const cache = new WeakMap<WebGLRenderer, Texture>()

export function useRoomEnv(): Texture {
  const gl = useThree((s) => s.gl)
  let tex = cache.get(gl)
  if (!tex) {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    tex = pmrem.fromScene(room, 0.04).texture
    pmrem.dispose()
    room.dispose()
    cache.set(gl, tex)
  }
  return tex
}
