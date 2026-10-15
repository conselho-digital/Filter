import { useStore } from '../../store/useStore'
import { ApartmentsPanel } from './ApartmentsPanel'
import { ComparePanel } from './ComparePanel'
import { GalleryPanel } from './GalleryPanel'
import { HighlightsPanel } from './HighlightsPanel'
import { LocationPanel } from './LocationPanel'

/** Renderiza a seção aberta pelo menu inferior. */
export function Sections() {
  const section = useStore((s) => s.section)
  const viewMode = useStore((s) => s.viewMode)
  if (!section || viewMode === 'windowView') return null
  switch (section) {
    case 'apartments':
      return <ApartmentsPanel />
    case 'compare':
      return <ComparePanel />
    case 'location':
      return <LocationPanel />
    case 'gallery':
      return <GalleryPanel />
    case 'highlights':
      return <HighlightsPanel />
  }
}
