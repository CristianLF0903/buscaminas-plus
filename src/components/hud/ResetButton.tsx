import { useGameStore } from '@/store/useGameStore'
import type { GameStatus } from '@/lib/engine/types'

const FACES: Record<GameStatus, string> = {
  idle: '🙂',
  playing: '🙂',
  won: '😎',
  lost: '😵',
}

export default function ResetButton() {
  const status = useGameStore((s) => s.status)
  const reset = useGameStore((s) => s.reset)
  return (
    <button
      type="button"
      onClick={reset}
      aria-label="Reiniciar partida"
      className="flex size-10 items-center justify-center rounded-md bg-slate-600 text-2xl shadow-[inset_0_-2px_0_rgb(0_0_0/0.25)] hover:bg-slate-500 active:translate-y-px"
    >
      {FACES[status]}
    </button>
  )
}
