import { useCountUp } from '@/hooks/useCountUp'
import type { FinishedReward } from '@/hooks/useGameRewards'

export default function RewardSummary({ reward }: { reward: FinishedReward }) {
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
