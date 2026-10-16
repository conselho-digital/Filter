import { Vector3 } from 'three'
import { MAIN_TOWER } from './tower'

/** Alvo e distância da vista aérea (compartilhados entre os dois rigs de câmera). */
// mira no centro da torre (que fica deslocada para o centro do lote)
export const AERIAL_TARGET = new Vector3(MAIN_TOWER.position[0], 8, MAIN_TOWER.position[2])

/** No celular a câmera fica travada neste ângulo (rad a partir da vertical): olha para baixo, sem horizonte. */
export const MOBILE_POLAR = 0.8
export const AERIAL_DISTANCE = 66
