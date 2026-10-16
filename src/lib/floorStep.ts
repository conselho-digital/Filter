/** Ponte entre a UI e a cena: sobe (+1) ou desce (-1) a câmera um andar. A cena registra a função. */
export const floorStep: { fn: ((dir: 1 | -1) => void) | null } = { fn: null }
