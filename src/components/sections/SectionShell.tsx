import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store/useStore'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  /** gaveta lateral (deixa a maquete visível) em vez de tela cheia */
  drawer?: boolean
}

/** Casca comum das seções: título, botão de fechar, Esc e foco gerenciado. */
export function SectionShell({ title, subtitle, children, drawer }: Props) {
  const openSection = useStore((s) => s.openSection)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') openSection(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [openSection])

  return (
    <section
      role="dialog"
      aria-modal={drawer ? undefined : true}
      aria-label={title}
      className={`glass pointer-events-auto absolute z-20 flex flex-col overflow-hidden ${
        drawer
          ? 'bottom-24 left-0 top-24 w-[min(100vw,430px)] rounded-r-3xl max-md:top-16 max-md:w-full max-md:rounded-none'
          : 'inset-x-3 bottom-24 top-3 rounded-3xl md:inset-x-6 md:top-6'
      }`}
    >
      <header className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
        <div>
          <h2 className="text-xl font-light uppercase tracking-[0.18em] text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label={`Fechar ${title}`}
          onClick={() => openSection(null)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X size={22} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
    </section>
  )
}
