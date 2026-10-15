import { useState } from 'react'
import { GraduationCap, HeartPulse, MapPin, ShoppingBag, TrainFront, Waves } from 'lucide-react'
import { POIS, type Poi } from '../../data/content'
import { SectionShell } from './SectionShell'

const ICON: Record<Poi['category'], typeof MapPin> = {
  praia: Waves,
  comercio: ShoppingBag,
  educacao: GraduationCap,
  saude: HeartPulse,
  transporte: TrainFront,
}

/** Mapa estilizado (sem tiles externos) com os pontos de interesse e as distâncias. */
export function LocationPanel() {
  const [activeId, setActiveId] = useState<string | null>('praia')
  const sorted = [...POIS].sort((a, b) => a.km - b.km)

  return (
    <SectionShell title="Localização" subtitle="Distâncias ilustrativas a partir do empreendimento">
      <div className="grid gap-5 md:grid-cols-[1fr_320px]">
        <div
          className="relative min-h-[320px] overflow-hidden rounded-2xl bg-[#e9efe6]"
          role="img"
          aria-label="Mapa estilizado com o empreendimento e os pontos de interesse"
        >
          {/* mar, praia e quadras */}
          <div className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-[#3b82c4] to-[#7fb6e6]" />
          <div className="absolute inset-x-0 top-[22%] h-[4%] bg-[#e8d8a8]" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <g stroke="#ffffff" strokeWidth="1.6" fill="none">
              <path d="M0 40 H100 M0 66 H100 M30 26 V100 M62 26 V100" />
            </g>
            <g stroke="#cfd8cb" strokeWidth="0.5" fill="none">
              <path d="M0 53 H100 M46 26 V100 M80 26 V100 M14 26 V100" />
            </g>
          </svg>
          <div
            className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-4 ring-white"
            style={{ left: '50%', top: '40%' }}
            title="Empreendimento"
          >
            <MapPin size={20} aria-hidden />
          </div>
          {POIS.map((p) => {
            const Icon = ICON[p.category]
            const on = p.id === activeId
            return (
              <button
                key={p.id}
                type="button"
                aria-label={`${p.name}, ${p.km} km`}
                aria-pressed={on}
                onClick={() => setActiveId(p.id)}
                className={`absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-transform focus-visible:outline-2 focus-visible:outline-brand ${
                  on ? 'scale-110 bg-ink-900 text-white' : 'bg-white text-ink-900'
                }`}
                style={{ left: `${p.pos[0]}%`, top: `${p.pos[1]}%` }}
              >
                <Icon size={22} aria-hidden />
              </button>
            )
          })}
        </div>

        <ul className="flex flex-col gap-2" aria-label="Pontos de interesse">
          {sorted.map((p) => {
            const Icon = ICON[p.category]
            const on = p.id === activeId
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  aria-pressed={on}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                    on ? 'bg-white text-ink-950' : 'bg-white/5 text-white hover:bg-white/15'
                  }`}
                >
                  <Icon size={20} aria-hidden />
                  <span className="flex-1">
                    <span className="block text-base">{p.name}</span>
                    <span className={`block text-sm ${on ? 'text-ink-950/60' : 'text-white/60'}`}>{p.time}</span>
                  </span>
                  <span className="tabular-nums">{p.km.toFixed(1).replace('.', ',')} km</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </SectionShell>
  )
}
