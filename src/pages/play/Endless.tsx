import { useState } from 'react'
import { useLocation } from 'wouter'
import GameView from '@/components/board/GameView'
import RewardSummary from '@/components/modals/RewardSummary'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import Modal from '@/components/ui/Modal'
import Toggle from '@/components/ui/Toggle'
import { useConfirmLeave } from '@/hooks/useConfirmLeave'
import { useEndless } from '@/hooks/useEndless'
import { LOGIC_HELP, LOGIC_LABEL, LOGIC_TAG } from '@/lib/copy'
import { endlessMultiplier } from '@/lib/economy/rewards'
import { CLASSIC_PRESETS } from '@/lib/modes/classic'
import { ENDLESS_DIFFICULTIES } from '@/lib/modes/endless'
import type { EndlessDifficulty } from '@/lib/modes/endless'
import { useGameStore } from '@/store/useGameStore'
import { recordKey, usePlayerStore } from '@/store/usePlayerStore'
import Icon from '@/components/ui/Icon'

const boards = (n: number) => (n === 1 ? 'tablero' : 'tableros')

interface Choice {
  difficulty: EndlessDifficulty
  noGuess: boolean
}

function Run({
  choice,
  onChoice,
  onRestart,
}: {
  choice: Choice
  onChoice: (c: Choice) => void
  onRestart: () => void
}) {
  const { difficulty, noGuess } = choice
  const { run, reward, firstReady, waiting, start } = useEndless(
    difficulty,
    noGuess,
  )
  const record = usePlayerStore(
    (s) => s.records[recordKey('endless', difficulty)],
  )
  const [dismissed, setDismissed] = useState(false)
  // El modal espera la onda que revela las minas
  const revealing = useGameStore((s) => s.revealing)
  const [, navigate] = useLocation()
  const best = record?.maxBoards ?? 0
  const clean = record?.maxBoardsNoPowerUps ?? 0
  const live = run.status === 'playing' || run.status === 'between'
  useConfirmLeave(
    live
      ? `La racha terminará aquí y cobrarás ${run.solved} ${boards(run.solved)}.`
      : null,
  )

  if (run.status === 'idle') {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-slate-800 p-5 text-center">
        <div
          role="tablist"
          aria-label="Dificultad"
          className="flex flex-wrap justify-center gap-2"
        >
          {ENDLESS_DIFFICULTIES.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={difficulty === key}
              onClick={() => onChoice({ ...choice, difficulty: key })}
              className={buttonClass(
                difficulty === key ? 'primary' : 'secondary',
              )}
            >
              {CLASSIC_PRESETS[key].label}
            </button>
          ))}
        </div>
        <Toggle
          checked={noGuess}
          onChange={(value) => onChoice({ ...choice, noGuess: value })}
          label={LOGIC_LABEL}
          description={LOGIC_HELP}
        />
        <p className="text-slate-300">
          Tableros seguidos hasta que pises una mina. Cada tablero paga más que
          el anterior.
        </p>
        <p className="text-sm">
          <Icon e="🏆" /> Mejor <b className="font-mono">{best}</b>{' '}
          {boards(best)}
          {clean > 0 && (
            <span className="text-slate-400">
              {' '}
              · sin power-ups <b className="font-mono">{clean}</b>
            </span>
          )}
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

  if (run.status === 'between') {
    return (
      <div
        role="status"
        className="flex w-full max-w-sm flex-col items-center gap-2 rounded-xl bg-slate-800 p-8 text-center"
      >
        <span className="text-sm text-emerald-300">
          <Icon e="✅" /> {run.solved} {boards(run.solved)}
        </span>
        <span
          key={run.board}
          className="animate-bump text-4xl font-bold tabular-nums"
        >
          Tablero {run.board + 1}
        </span>
        <span className="text-sm text-amber-300">
          <Icon e="🪙" /> ×{endlessMultiplier(run.board + 1)}
        </span>
        <span className="min-h-5 text-sm text-slate-400">
          {waiting ? 'Generando…' : ''}
        </span>
      </div>
    )
  }

  const over = run.status === 'over'
  return (
    <>
      <p className="flex gap-4 text-sm text-slate-300 tabular-nums">
        <span>
          Tablero <b className="font-mono">{run.board}</b>
        </span>
        <span>
          <Icon e="✅" /> <b className="font-mono">{run.solved}</b>
        </span>
        <span className="text-amber-300">
          <Icon e="🪙" /> ×{endlessMultiplier(run.board)}
        </span>
      </p>
      <GameView mode="endless" allowReset={false} />
      {over && (
        <div className="grid w-full max-w-sm grid-cols-2 gap-2">
          <Button variant="primary" onClick={onRestart}>
            Otra vez
          </Button>
          <Button onClick={() => navigate('/')}>Menú</Button>
        </div>
      )}
      <Modal
        open={over && !revealing && !dismissed}
        onClose={() => setDismissed(true)}
        title="Fin de la racha 💥"
      >
        <p className="text-center text-slate-300">
          Resolviste <b className="font-mono text-emerald-400">{run.solved}</b>{' '}
          {boards(run.solved)} en {CLASSIC_PRESETS[difficulty].label}
        </p>
        <p className="text-center text-sm text-slate-400">
          <Icon e="🏆" /> Récord: <b className="font-mono">{best}</b>{' '}
          {boards(best)}
        </p>
        {reward && !revealing && <RewardSummary reward={reward} />}
        <div className="flex flex-col gap-2">
          <Button variant="primary" onClick={onRestart} autoFocus>
            Otra vez
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setDismissed(true)}>Ver tablero</Button>
            <Button onClick={() => navigate('/')}>Menú</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default function Endless() {
  const [choice, setChoice] = useState<Choice>({
    difficulty: 'easy',
    noGuess: true,
  })
  // Cambiar la key reinicia la racha (y pre-genera con la nueva elección)
  const [run, setRun] = useState(0)
  const { difficulty, noGuess } = choice
  return (
    <section className="flex w-full flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Infinito</h1>
        <p className="text-sm text-slate-400">
          {CLASSIC_PRESETS[difficulty].label}
          {noGuess ? ` · ${LOGIC_TAG}` : ''}
        </p>
      </div>
      <Run
        key={`${difficulty}:${noGuess}:${run}`}
        choice={choice}
        onChoice={setChoice}
        onRestart={() => setRun((n) => n + 1)}
      />
    </section>
  )
}
