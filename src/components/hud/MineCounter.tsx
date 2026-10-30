import { selectMinesLeft, useGameStore } from '@/store/useGameStore'

/** Minas restantes; con límite de banderas, las banderas que quedan. */
export default function MineCounter() {
  const left = useGameStore(selectMinesLeft)
  const flagLimit = useGameStore((s) => s.board.flagLimit)
  const flagsUsed = useGameStore((s) => s.flagsUsed)

  if (flagLimit !== undefined) {
    const flagsLeft = flagLimit - flagsUsed
    return (
      <div
        aria-label="Banderas restantes"
        className={`min-w-16 rounded-md bg-slate-950 px-2 py-1 text-center font-mono text-lg tabular-nums ${flagsLeft === 0 ? 'text-amber-400' : 'text-rose-400'}`}
      >
        🚩 {flagsLeft}
      </div>
    )
  }

  return (
    <div
      aria-label="Minas restantes"
      className={`min-w-16 rounded-md bg-slate-950 px-2 py-1 text-center font-mono text-lg tabular-nums ${left < 0 ? 'text-amber-400' : 'text-rose-400'}`}
    >
      💣 {left}
    </div>
  )
}
