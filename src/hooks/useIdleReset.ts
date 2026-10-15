import { useEffect } from 'react'
import { useStore } from '../store/useStore'

const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

/** Zera a sessão do cliente (favoritos, comparação, preços, seleção) após um tempo sem toque. */
export function useIdleReset(ms = 3 * 60 * 1000) {
  const resetSession = useStore((s) => s.resetSession)

  useEffect(() => {
    let timer = window.setTimeout(resetSession, ms)
    const bump = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(resetSession, ms)
    }
    EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      EVENTS.forEach((e) => window.removeEventListener(e, bump))
    }
  }, [ms, resetSession])
}
