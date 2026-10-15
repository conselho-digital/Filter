import { Building2, Leaf, Sparkles, Waves } from 'lucide-react'
import { HIGHLIGHTS, type Highlight } from '../../data/content'
import { SectionShell } from './SectionShell'

const GROUPS: { name: Highlight['group']; Icon: typeof Building2 }[] = [
  { name: 'Arquitetura', Icon: Building2 },
  { name: 'Lazer', Icon: Waves },
  { name: 'Sustentabilidade', Icon: Leaf },
  { name: 'Comodidades', Icon: Sparkles },
]

/** Diferenciais do empreendimento, por grupo. */
export function HighlightsPanel() {
  return (
    <SectionShell title="Destaques" subtitle="Os diferenciais do empreendimento">
      <div className="grid gap-4 md:grid-cols-2">
        {GROUPS.map(({ name, Icon }) => (
          <section key={name} aria-labelledby={`hl-${name}`} className="rounded-2xl bg-white/5 p-5">
            <h3 id={`hl-${name}`} className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-[#c9a45c]">
              <Icon size={20} aria-hidden />
              {name}
            </h3>
            <ul className="flex flex-col gap-3">
              {HIGHLIGHTS.filter((h) => h.group === name).map((h) => (
                <li key={h.id}>
                  <p className="text-base text-white">{h.title}</p>
                  <p className="text-sm text-white/65">{h.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SectionShell>
  )
}
