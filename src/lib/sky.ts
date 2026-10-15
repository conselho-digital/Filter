import { Color } from 'three'

export interface SkyState {
  /** direção do sol (vetor unitário) */
  sunDir: [number, number, number]
  sunColor: Color
  sunIntensity: number
  ambientIntensity: number
  skyColor: Color
  fogColor: Color
  seaColor: Color
  /** 0 = dia, 1 = noite fechada; controla janelas acesas e estrelas */
  night: number
}

interface Key {
  t: number
  elevation: number // graus acima do horizonte
  azimuth: number // graus
  sun: string
  sky: string
  fog: string
  sea: string
  sunI: number
  ambI: number
  night: number
}

const KEYS: Key[] = [
  { t: 0.0, elevation: 7, azimuth: 55, sun: '#ffb27a', sky: '#f2a98c', fog: '#e9b9a3', sea: '#4d7a9a', sunI: 1.6, ambI: 0.65, night: 0.25 },
  { t: 0.33, elevation: 52, azimuth: 28, sun: '#fff4e0', sky: '#79b6f0', fog: '#bcd8f2', sea: '#1d6fa5', sunI: 3.4, ambI: 0.85, night: 0 },
  { t: 0.66, elevation: 6, azimuth: -55, sun: '#ff8a3d', sky: '#f08a5d', fog: '#e3a37b', sea: '#2b5d86', sunI: 1.8, ambI: 0.65, night: 0.15 },
  { t: 1.0, elevation: -20, azimuth: -70, sun: '#7a90d0', sky: '#0f1c42', fog: '#16264f', sea: '#12284d', sunI: 0.5, ambI: 0.95, night: 1 },
]

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const smooth = (k: number) => k * k * (3 - 2 * k)

/** Interpola os quatro marcos do dia e devolve luz, céu e névoa. */
export function skyAt(timeOfDay: number): SkyState {
  const t = Math.min(1, Math.max(0, timeOfDay))
  let i = 0
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const k = smooth((t - a.t) / (b.t - a.t))

  const elevation = lerp(a.elevation, b.elevation, k)
  const azimuth = lerp(a.azimuth, b.azimuth, k)
  const el = (elevation * Math.PI) / 180
  const az = (azimuth * Math.PI) / 180

  const mix = (x: string, y: string) => new Color(x).lerp(new Color(y), k)

  return {
    sunDir: [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)],
    sunColor: mix(a.sun, b.sun),
    sunIntensity: lerp(a.sunI, b.sunI, k),
    ambientIntensity: lerp(a.ambI, b.ambI, k),
    skyColor: mix(a.sky, b.sky),
    fogColor: mix(a.fog, b.fog),
    seaColor: mix(a.sea, b.sea),
    night: lerp(a.night, b.night, k),
  }
}
