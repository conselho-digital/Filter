import { Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import { useStore } from '../../store/useStore'

const MARKS = [
  { t: 0, label: 'Amanhecer', Icon: Sunrise },
  { t: 0.33, label: 'Dia', Icon: Sun },
  { t: 0.66, label: 'Pôr do sol', Icon: Sunset },
  { t: 1, label: 'Noite', Icon: Moon },
] as const

/** Barra superior de horário do dia: arraste ou toque num ícone. */
export function TimeSlider() {
  const timeOfDay = useStore((s) => s.timeOfDay)
  const setTimeOfDay = useStore((s) => s.setTimeOfDay)

  return (
    <div className="glass pointer-events-auto absolute left-1/2 top-4 w-[min(92vw,720px)] -translate-x-1/2 rounded-2xl px-5 pb-4 pt-3 max-md:top-2 max-md:rounded-xl max-md:px-4 max-md:py-0.5">
      <div className="relative mb-2 h-12 max-md:mb-0 max-md:h-7">
        {MARKS.map(({ t, label, Icon }) => {
          const active = Math.abs(timeOfDay - t) < 0.17
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => setTimeOfDay(t)}
              className="absolute top-0 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-brand max-md:h-7 max-md:w-10"
              style={{ left: `${t * 100}%` }}
            >
              <Icon
                size={26}
                className={`max-md:h-[18px] max-md:w-[18px] ${active ? 'text-white' : 'text-white/45'}`}
                strokeWidth={1.6}
              />
            </button>
          )
        })}
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={timeOfDay}
        onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
        aria-label="Horário do dia"
        aria-valuetext={MARKS.reduce((best, m) => (Math.abs(m.t - timeOfDay) < Math.abs(best.t - timeOfDay) ? m : best)).label}
        className="time-range h-8 w-full cursor-pointer max-md:h-5"
      />
    </div>
  )
}
