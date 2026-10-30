import { useState } from 'react'
import { useLocation } from 'wouter'
import GameView from '@/components/board/GameView'
import RewardSummary from '@/components/modals/RewardSummary'
import Button from '@/components/ui/Button'
import { useConfirmLeave } from '@/hooks/useConfirmLeave'
import { useTimeAttack } from '@/hooks/useTimeAttack'
import type { TimeChange } from '@/hooks/useTimeAttack'
import { LOGIC_TAG } from '@/lib/copy'
import { LOW_TIME_MS, START_MS } from '@/lib/modes/timeAttack'
import { formatTime } from '@/lib/time'
import { recordKey, usePlayerStore } from '@/store/usePlayerStore'
import Icon from '@/components/ui/Icon'

/** El reloj muestra segundos completos hacia arriba: 60 s se ve 1:00. */
const showClock = (ms: number) => formatTime(Math.ceil(ms / 1000) * 1000)

function Clock({
  remaining,
  change,
  paused,
}: {
  remaining: number
  change: TimeChange | null
  paused: boolean
}) {
  const low = remaining <= LOW_TIME_MS
  return (
    <div className="relative flex flex-col items-center">
      <span
        key={change?.id}
        role="timer"
        aria-label="Tiempo restante"
        className={`font-mono text-6xl font-bold tabular-nums ${
          change ? 'animate-bump' : ''
        } ${low ? 'text-rose-400' : 'text-emerald-400'}`}
      >
        {showClock(remaining)}
      </span>
      {change && (
        <span
          key={`delta-${change.id}`}
          aria-live="polite"
          className={`absolute -top-2 -right-14 animate-float-up font-mono text-xl font-bold ${
            change.ms > 0 ? 'text-emerald-300' : 'text-rose-400'
          }`}
        >
          {change.ms > 0 ? '+' : '−'}
          {Math.abs(change.ms) / 1000} s
        </span>
      )}
      <span className="min-h-5 text-sm text-slate-400">
        {paused ? 'Preparando el siguiente tablero…' : ''}
      </span>
    </div>
  )
}

function Run({ onRestart }: { onRestart: () => void }) {
  const { session, remaining, board, change, reward, firstReady, start } =
    useTimeAttack()
  const best = usePlayerStore(
    (s) => s.records[recordKey('timeAttack', 'default')]?.maxBoards ?? 0,
  )
  const [, navigate] = useLocation()
  const live = session.status === 'running' || session.status === 'paused'
  useConfirmLeave(
    live
      ? 'La sesión terminará aquí y cobrarás solo los tableros resueltos.'
      : null,
  )

  if (session.status === 'idle') {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-slate-800 p-5 text-center">
        <p className="text-slate-300">
          Empiezas con {START_MS / 1000} s. Cada tablero resuelto suma tiempo;
          pisar una mina resta 10 s y pasa al siguiente.
        </p>
        <p className="text-sm">
          <Icon e="🏆" /> Mejor <b className="font-mono">{best}</b>{' '}
          {best === 1 ? 'tablero' : 'tableros'}
        </p>
        <Button
          variant="primary"
          onClick={() => void start()}
          disabled={!firstReady}
          autoFocus
        >
          {firstReady ? 'Comenzar' : 'Preparando…'}
        </Button>
      </div>
    )
  }

  if (session.status === 'over') {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-slate-800 p-5">
        <h2 className="text-center text-xl font-bold">
          <Icon e="⏱" /> ¡Tiempo!
        </h2>
        <p className="text-center text-slate-300">
          Resolviste{' '}
          <b className="font-mono text-emerald-400">{session.solved}</b>{' '}
          {session.solved === 1 ? 'tablero' : 'tableros'}
          {session.failed > 0 && (
            <>
              {' '}
              · <Icon e="💥" /> {session.failed}
            </>
          )}
        </p>
        {reward && <RewardSummary reward={reward} />}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={onRestart} autoFocus>
            Otra vez
          </Button>
          <Button onClick={() => navigate('/')}>Menú</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Clock
        remaining={remaining}
        change={change}
        paused={session.status === 'paused'}
      />
      <GameView
        mode="timeAttack"
        allowReset={false}
        timer={
          <div
            aria-label="Tableros resueltos"
            className="min-w-16 rounded-md bg-slate-950 px-2 py-1 text-center font-mono text-lg text-emerald-400 tabular-nums"
          >
            <Icon e="✅" /> {session.solved}
          </div>
        }
      />
      <p className="text-xs text-slate-500">Tablero #{board}</p>
    </>
  )
}

export default function TimeAttack() {
  // Cambiar la key reinicia la sesión entera (reloj, worker, tableros)
  const [run, setRun] = useState(0)
  return (
    <section className="flex w-full flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Contrarreloj</h1>
        <p className="text-sm text-slate-400">8×8 · 10 minas · {LOGIC_TAG}</p>
      </div>
      <Run key={run} onRestart={() => setRun((n) => n + 1)} />
    </section>
  )
}
