import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { GALLERY } from '../../data/content'
import { SectionShell } from './SectionShell'

const nav =
  'absolute top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-white'

/** Galeria de renders do empreendimento, com visualização ampliada (lightbox). */
export function GalleryPanel() {
  const [open, setOpen] = useState<number | null>(null)
  const step = (d: number) => setOpen((i) => (i === null ? i : (i + d + GALLERY.length) % GALLERY.length))

  // no lightbox, Esc fecha só a imagem (a captura vem antes do Esc da seção)
  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        setOpen(null)
      } else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <SectionShell title="Galeria" subtitle={`${GALLERY.length} imagens do empreendimento`}>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {GALLERY.map((g, i) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Ampliar: ${g.title}`}
              className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-white/5 focus-visible:outline-2 focus-visible:outline-white"
            >
              <img src={g.src} alt={g.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-left text-sm text-white">
                {g.title}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open !== null &&
        createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={GALLERY[open].title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          <img
            src={GALLERY[open].src}
            alt={GALLERY[open].alt}
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
            {GALLERY[open].title} · {open + 1}/{GALLERY.length}
          </p>
          <button type="button" aria-label="Fechar imagem" className={`${nav} right-4 top-8 translate-y-0`} onClick={() => setOpen(null)}>
            <X size={24} />
          </button>
          <button type="button" aria-label="Imagem anterior" className={`${nav} left-4`} onClick={(e) => { e.stopPropagation(); step(-1) }}>
            <ChevronLeft size={28} />
          </button>
          <button type="button" aria-label="Próxima imagem" className={`${nav} right-4`} onClick={(e) => { e.stopPropagation(); step(1) }}>
            <ChevronRight size={28} />
          </button>
        </div>,
        document.body,
      )}
    </SectionShell>
  )
}
