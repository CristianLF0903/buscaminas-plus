import { useState } from 'react'
import { useLocation } from 'wouter'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Stars from '@/components/ui/Stars'
import type { FinishedReward } from '@/hooks/useGameRewards'
import { newStarsOf, STAR, STAR_LABELS, starsFor } from '@/lib/modes/puzzle'
import { formatTime } from '@/lib/time'
import { elapsedMs, useGameStore } from '@/store/useGameStore'
import RewardSummary from './RewardSummary'

/** Resultado de un nivel: estrellas, monedas y siguiente nivel. */
export default function PuzzleResult({
  level,
  targetMs,
  prevStars,
  reward,
  onRetry,
}: {
  level: number
  targetMs: number
  /** Estrellas del nivel antes de esta partida (para marcar las nuevas). */
  prevStars: number
  reward: FinishedReward | null
  onRetry: () => void
}) {
  const status = useGameStore((s) => s.status)
  const startedAt = useGameStore((s) => s.startedAt)
  const endedAt = useGameStore((s) => s.endedAt)
  const usedPowerUps = useGameStore((s) => s.usedPowerUps)
  const [, navigate] = useLocation()
  // Partida cerrada con "Ver tablero"; una nueva vuelve a abrirlo
  const [dismissed, setDismissed] = useState<number | null>(null)

  const over = status === 'won' || status === 'lost'
  const won = status === 'won'
  const timeMs = elapsedMs(startedAt, endedAt, endedAt ?? 0)
  const stars = starsFor({ won, timeMs, targetMs, usedPowerUps })
  const fresh = newStarsOf(prevStars, stars)

  return (
    <Modal
      open={over && endedAt !== dismissed}
      onClose={() => setDismissed(endedAt)}
      title={won ? `¡Nivel ${level} superado!` : 'Boom 💥'}
    >
      {won ? (
        <>
          <div className="flex justify-center">
            <Stars mask={stars} size="lg" highlight={fresh} />
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {STAR_LABELS.map(([bit, label]) => (
              <li
                key={bit}
                className={stars & bit ? 'text-slate-200' : 'text-slate-500'}
              >
                {stars & bit ? '★' : '☆'} {label}
                {bit === STAR.time && (
                  <span className="font-mono text-slate-400">
                    {' '}
                    ({formatTime(timeMs)} / {formatTime(targetMs)})
                  </span>
                )}
                {fresh & bit ? (
                  <span className="ml-1 text-xs font-bold text-amber-300">
                    ¡nueva!
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-center text-slate-300">
          Pisaste una mina a los{' '}
          <span className="font-mono text-emerald-400">
            {formatTime(timeMs)}
          </span>
          . Mismo tablero, otra oportunidad.
        </p>
      )}
      {reward && <RewardSummary key={endedAt} reward={reward} />}
      <div className="flex flex-col gap-2">
        {won ? (
          <Button
            variant="primary"
            onClick={() => navigate(`/play/puzzle/${level + 1}`)}
            autoFocus
          >
            Siguiente nivel →
          </Button>
        ) : (
          <Button variant="primary" onClick={onRetry} autoFocus>
            Reintentar
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {won ? (
            <Button onClick={onRetry}>Reintentar</Button>
          ) : (
            <Button onClick={() => setDismissed(endedAt)}>Ver tablero</Button>
          )}
          <Button onClick={() => navigate('/play/puzzle')}>Niveles</Button>
        </div>
      </div>
    </Modal>
  )
}
