import { useTimer } from '@/hooks/useTimer'
import { formatTime } from '@/lib/time'
import { useSettingsStore } from '@/store/useSettingsStore'

export default function Timer() {
  const ms = useTimer()
  const show = useSettingsStore((s) => s.showTimer)
  return (
    <div
      aria-label="Tiempo"
      // Oculto en Ajustes: conserva el hueco para no mover el HUD
      aria-hidden={!show}
      className={`min-w-16 rounded-md bg-slate-950 px-2 py-1 text-center font-mono text-lg text-emerald-400 tabular-nums ${show ? '' : 'invisible'}`}
    >
      ⏱ {formatTime(ms)}
    </div>
  )
}
