import { useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'wouter'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useCountUp } from '@/hooks/useCountUp'
import type { FinishedReward } from '@/hooks/useGameRewards'
import { formatTime } from '@/lib/time'
import { elapsedMs, useGameStore } from '@/store/useGameStore'

function RewardSummary({ reward }: { reward: FinishedReward }) {
  const shown = useCountUp(reward.total)
  const lines: [string, number][] = [
    ['Partida', reward.base],
    ['Sin power-ups', reward.noPowerUpBonus],
    ['Récord', reward.recordBonus],
  ]
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-900/60 p-3">
      {reward.isRecord && (
        <span className="rounded-full bg-amber-400/15 px-3 py-0.5 text-xs font-bold tracking-wide text-amber-300 uppercase">
          ¡Nuevo récord!
        </span>
      )}
      <p
        className="font-mono text-3xl font-bold text-amber-300 tabular-nums"
        aria-label={`${reward.total} monedas ganadas`}
      >
        +{shown} <span aria-hidden>🪙</span>
      </p>
      <dl className="grid w-full grid-cols-[1fr_auto] gap-x-4 text-xs text-slate-400">
        {lines
          .filter(([, n]) => n > 0)
          .map(([label, n]) => (
            <div key={label} className="contents">
              <dt>{label}</dt>
              <dd className="text-right font-mono">+{n}</dd>
            </div>
          ))}
      </dl>
    </div>
  )
}

export default function ResultModal({
  reward,
  allowRetry = true,
  children,
}: {
  reward: FinishedReward | null
  /** false en modos de un solo intento (reto diario). */
  allowRetry?: boolean
  /** Contenido extra del modo (ej. compartir resultado). */
  children?: ReactNode
}) {
  const status = useGameStore((s) => s.status)
  const startedAt = useGameStore((s) => s.startedAt)
  const endedAt = useGameStore((s) => s.endedAt)
  const reset = useGameStore((s) => s.reset)
  const [, navigate] = useLocation()
  // Se guarda qué partida se cerró: una nueva partida vuelve a abrir el modal
  const [dismissed, setDismissed] = useState<number | null>(null)

  const over = status === 'won' || status === 'lost'
  const open = over && endedAt !== dismissed
  const won = status === 'won'
  const time = formatTime(elapsedMs(startedAt, endedAt, endedAt ?? 0))

  return (
    <Modal
      open={open}
      onClose={() => setDismissed(endedAt)}
      title={won ? '¡Victoria!' : 'Boom 💥'}
    >
      <div className="text-center text-6xl" aria-hidden>
        {won ? '😎' : '😵'}
      </div>
      <p className="text-center text-slate-300">
        {won ? 'Despejaste el tablero en ' : 'Pisaste una mina a los '}
        <span className="font-mono font-semibold text-emerald-400">{time}</span>
      </p>
      {reward && <RewardSummary key={endedAt} reward={reward} />}
      {children}
      <div className="flex flex-col gap-2">
        {allowRetry && (
          <Button variant="primary" onClick={reset} autoFocus>
            Otra vez
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setDismissed(endedAt)}>Ver tablero</Button>
          <Button onClick={() => navigate('/')}>Menú</Button>
        </div>
      </div>
    </Modal>
  )
}
