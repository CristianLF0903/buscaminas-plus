import type { ReactNode } from 'react'
import MineCounter from '@/components/hud/MineCounter'
import PowerUpBar from '@/components/hud/PowerUpBar'
import ResetButton from '@/components/hud/ResetButton'
import Timer from '@/components/hud/Timer'
import { LOGIC_FALLBACK } from '@/lib/copy'
import type { GameMode } from '@/lib/economy/rewards'
import { useGameStore } from '@/store/useGameStore'
import Board from './Board'

/** HUD + tablero + power-ups de la partida actual del store. */
export default function GameView({
  mode,
  allowReset = true,
  timer = <Timer />,
}: {
  mode: GameMode
  /** false en modos de un solo intento (reto diario). */
  allowReset?: boolean
  /** Reemplaza el cronómetro (contrarreloj lleva su propio reloj). */
  timer?: ReactNode
}) {
  const generating = useGameStore((s) => s.generating)
  const guaranteed = useGameStore((s) => s.guaranteed)

  return (
    <div className="flex max-w-full flex-col items-center gap-3 rounded-xl bg-slate-800 p-2 shadow-xl sm:p-3">
      <div className="flex w-full items-center justify-between gap-4">
        <MineCounter />
        <ResetButton disabled={!allowReset} />
        {timer}
      </div>
      <div className="relative max-w-full" aria-busy={generating}>
        <Board />
        {generating && (
          <div
            role="status"
            className="absolute inset-0 flex animate-delayed-fade-in items-center justify-center gap-2 rounded-lg bg-slate-900/70 text-sm font-semibold text-slate-200"
          >
            <span className="size-4 animate-spin rounded-full border-2 border-slate-500 border-t-emerald-400" />
            Generando…
          </div>
        )}
      </div>
      <PowerUpBar mode={mode} />
      {guaranteed === false && (
        <p role="note" className="text-center text-xs text-amber-400">
          {LOGIC_FALLBACK}
        </p>
      )}
    </div>
  )
}
