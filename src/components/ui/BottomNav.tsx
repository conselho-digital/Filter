import { Building2, GitCompareArrows, Images, MapPin, Sparkles } from 'lucide-react'
import { useStore, type Section } from '../../store/useStore'

const ITEMS: { id: Section; label: string; Icon: typeof Building2 }[] = [
  { id: 'apartments', label: 'Apartamentos', Icon: Building2 },
  { id: 'compare', label: 'Comparar', Icon: GitCompareArrows },
  { id: 'location', label: 'Localização', Icon: MapPin },
  { id: 'gallery', label: 'Galeria', Icon: Images },
  { id: 'highlights', label: 'Destaques', Icon: Sparkles },
]

/** Menu inferior em vidro fosco que abre as seções. */
export function BottomNav() {
  const viewMode = useStore((s) => s.viewMode)
  const section = useStore((s) => s.section)
  const openSection = useStore((s) => s.openSection)
  const compareCount = useStore((s) => s.compareIds.length)
  const hasUnit = useStore((s) => s.selectedUnitId !== null)

  // na planta e na vista da varanda o menu sai de cena
  if (viewMode === 'windowView' || viewMode === 'blueprint' || viewMode === 'floorplan' || viewMode === 'plan3d') return null

  return (
    <nav
      aria-label="Seções"
      className={`glass pointer-events-auto absolute bottom-4 z-30 flex max-w-[96vw] -translate-x-1/2 items-stretch gap-1 rounded-2xl p-1.5 ${
        hasUnit ? 'left-1/2 md:left-[calc(50%-190px)]' : 'left-1/2'
      }`}
    >
      {ITEMS.map(({ id, label, Icon }) => {
        const on = section === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => openSection(on ? null : id)}
            className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-xs font-medium uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-white md:min-w-24 md:px-4 ${
              on ? 'bg-white text-ink-950' : 'text-white hover:bg-white/15'
            }`}
          >
            <Icon size={20} aria-hidden />
            <span className="max-md:sr-only">{id === 'compare' ? `${label} (${compareCount})` : label}</span>
            {id === 'compare' && compareCount > 0 && (
              <span className="md:sr-only" aria-hidden>
                {compareCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
