import { useEffect, useRef, useState } from 'react'
import { Camera, Footprints, Info, X } from 'lucide-react'
import { downloadScreenshot } from '../../lib/capture'
import { useStore } from '../../store/useStore'

const btn =
  'glass pointer-events-auto flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white'

const TIPS: [string, string][] = [
  ['Arraste', 'gira a maquete em volta da torre'],
  ['Pinça (ou Ctrl + roda no computador)', 'aproxima e afasta'],
  ['Três dedos para cima ou para baixo (ou rolagem do trackpad)', 'sobe e desce pelos andares'],
  ['Toque num apartamento', 'abre os dados, a planta e a vista da varanda'],
  ['Marque Disponível, Reservado ou Vendido', 'mostra as cores de cada situação'],
  ['Barra de horário', 'muda da manhã à noite, inclusive na vista da varanda'],
  ['Walk 3D', 'tour automático em volta da torre; toque para parar'],
]

/** Walk 3D (tour), captura de tela e ajuda, no canto inferior direito. */
export function CornerButtons() {
  const viewMode = useStore((s) => s.viewMode)
  const section = useStore((s) => s.section)
  const touring = useStore((s) => s.touring)
  const setTouring = useStore((s) => s.setTouring)
  const hasUnit = useStore((s) => s.selectedUnitId !== null)
  const [help, setHelp] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const infoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!help) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setHelp(false)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      infoRef.current?.focus()
    }
  }, [help])

  if (viewMode !== 'aerial' || section || hasUnit) return null

  return (
    <>
      <div className="absolute bottom-4 right-4 z-30 flex gap-2 max-md:bottom-24 max-md:right-3">
        <button type="button" aria-pressed={touring} className={`${btn} ${touring ? '!bg-white !text-ink-950' : ''}`} onClick={() => setTouring(!touring)}>
          <Footprints size={20} aria-hidden />
          <span className="max-md:sr-only">Walk 3D</span>
        </button>
        <button type="button" aria-label="Capturar imagem da maquete" className={`${btn} !px-0 w-12`} onClick={downloadScreenshot}>
          <Camera size={20} aria-hidden />
        </button>
        <button ref={infoRef} type="button" aria-label="Ajuda" className={`${btn} !px-0 w-12`} onClick={() => setHelp(true)}>
          <Info size={20} aria-hidden />
        </button>
      </div>
      {help && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setHelp(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Como usar a maquete"
            className="glass glass-70 relative flex w-full max-w-md flex-col gap-3 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button ref={closeRef} type="button" aria-label="Fechar ajuda" className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white" onClick={() => setHelp(false)}>
              <X size={22} aria-hidden />
            </button>
            <h2 className="pr-12 text-lg font-medium uppercase tracking-[0.18em] text-white">Como usar</h2>
            <ul className="flex flex-col gap-3 text-white/90">
              {TIPS.map(([k, v]) => (
                <li key={k} className="text-base">
                  <strong className="font-medium text-white">{k}:</strong> {v}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  )
}
