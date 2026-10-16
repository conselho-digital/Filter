/** Ponte entre a UI e o Canvas: a cena registra aqui como gerar uma imagem do quadro atual. */
export const capture: { fn: (() => string) | null } = { fn: null }

/** Baixa uma imagem PNG da maquete (só a cena 3D, sem a interface). */
export function downloadScreenshot() {
  const url = capture.fn?.()
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = 'maquete.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
