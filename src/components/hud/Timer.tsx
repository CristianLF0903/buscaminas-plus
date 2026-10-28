import { useTimer } from '@/hooks/useTimer'
import { formatTime } from '@/lib/time'

export default function Timer() {
  const ms = useTimer()
  return (
    <div
      aria-label="Tiempo"
      className="min-w-16 rounded-md bg-slate-950 px-2 py-1 text-center font-mono text-lg text-emerald-400 tabular-nums"
    >
      ⏱ {formatTime(ms)}
    </div>
  )
}
