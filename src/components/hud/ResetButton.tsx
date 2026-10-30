import { useGameStore } from '@/store/useGameStore'
import type { GameStatus } from '@/lib/engine/types'
import Icon from '@/components/ui/Icon'

const FACES: Record<GameStatus, string> = {
  idle: '🙂',
  playing: '🙂',
  won: '😎',
  lost: '😵',
}

export default function ResetButton({
  disabled = false,
}: {
  disabled?: boolean
}) {
  const status = useGameStore((s) => s.status)
  const reset = useGameStore((s) => s.reset)
  return (
    <button
      type="button"
      onClick={reset}
      disabled={disabled}
      aria-label="Reiniciar partida"
      className="flex size-10 items-center justify-center rounded-md bg-slate-600 text-2xl shadow-[inset_0_-2px_0_rgb(0_0_0/0.25)] hover:bg-slate-500 active:translate-y-px disabled:cursor-default disabled:hover:bg-slate-600 disabled:active:translate-y-0"
    >
      <Icon e={FACES[status]} />
    </button>
  )
}
