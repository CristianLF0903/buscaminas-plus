import { selectMinesLeft, useGameStore } from '@/store/useGameStore'

export default function MineCounter() {
  const left = useGameStore(selectMinesLeft)
  return (
    <div
      aria-label="Minas restantes"
      className={`min-w-16 rounded-md bg-slate-950 px-2 py-1 text-center font-mono text-lg tabular-nums ${left < 0 ? 'text-amber-400' : 'text-rose-400'}`}
    >
      💣 {left}
    </div>
  )
}
