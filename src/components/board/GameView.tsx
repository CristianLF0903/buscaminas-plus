import MineCounter from '@/components/hud/MineCounter'
import ResetButton from '@/components/hud/ResetButton'
import Timer from '@/components/hud/Timer'
import Board from './Board'

/** HUD + tablero de la partida actual del store. */
export default function GameView() {
  return (
    <div className="flex max-w-full flex-col items-center gap-3 rounded-xl bg-slate-800 p-3 shadow-xl">
      <div className="flex w-full items-center justify-between gap-4">
        <MineCounter />
        <ResetButton />
        <Timer />
      </div>
      <Board />
    </div>
  )
}
