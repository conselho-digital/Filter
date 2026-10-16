import { useEffect, useState } from 'react'
import { Cloud, CloudRain, Settings, Sun, X } from 'lucide-react'
import { useStore, type AreaUnit, type Quality } from '../../store/useStore'

const WEATHER_LABEL = { clear: 'Céu limpo', clouds: 'Nublado', rain: 'Chuva' } as const
const iconBtn =
  'glass pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white'

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">{label}</span>
      <div role="group" aria-label={label} className="flex gap-1 rounded-xl bg-white/10 p-1">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`min-h-12 flex-1 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${
              value === v ? 'bg-white text-ink-950' : 'text-white hover:bg-white/15'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Engrenagem de configurações e alternador de clima, ao lado do controle de horário. */
export function TopControls() {
  const weather = useStore((s) => s.weather)
  const cycleWeather = useStore((s) => s.cycleWeather)
  const quality = useStore((s) => s.quality)
  const setQuality = useStore((s) => s.setQuality)
  const areaUnit = useStore((s) => s.areaUnit)
  const setAreaUnit = useStore((s) => s.setAreaUnit)
  const viewMode = useStore((s) => s.viewMode)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (viewMode === 'blueprint' || viewMode === 'plan3d') return null
  const WeatherIcon = weather === 'rain' ? CloudRain : weather === 'clouds' ? Cloud : Sun
  const next = weather === 'clear' ? 'Nublado' : weather === 'clouds' ? 'Chuva' : 'Céu limpo'

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 flex flex-col items-end gap-2 max-lg:right-3 max-lg:top-[92px]">
      <div className="flex gap-2">
        <button
          type="button"
          aria-label={`Clima: ${WEATHER_LABEL[weather]}. Alternar para ${next}`}
          title={WEATHER_LABEL[weather]}
          className={iconBtn}
          onClick={cycleWeather}
        >
          <WeatherIcon size={22} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Configurações"
          aria-expanded={open}
          className={iconBtn}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} aria-hidden /> : <Settings size={22} aria-hidden />}
        </button>
      </div>
      {open && (
        <section aria-label="Configurações" className="glass glass-70 pointer-events-auto flex w-72 flex-col gap-4 rounded-2xl p-4">
          <Segmented<Quality>
            label="Qualidade gráfica"
            value={quality}
            options={[
              ['high', 'Alta'],
              ['low', 'Econômica'],
            ]}
            onChange={setQuality}
          />
          <Segmented<AreaUnit>
            label="Unidade de área"
            value={areaUnit}
            options={[
              ['m2', 'm²'],
              ['ft2', 'ft²'],
            ]}
            onChange={setAreaUnit}
          />
          <p className="text-xs text-white/70">Idioma: Português (outros idiomas em breve).</p>
        </section>
      )}
    </div>
  )
}
