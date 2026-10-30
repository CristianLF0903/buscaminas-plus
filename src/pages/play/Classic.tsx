import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import GameView from '@/components/board/GameView'
import ConfirmModal from '@/components/modals/ConfirmModal'
import ResultModal from '@/components/modals/ResultModal'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import Toggle from '@/components/ui/Toggle'
import { useConfirmLeave } from '@/hooks/useConfirmLeave'
import { useGameRewards } from '@/hooks/useGameRewards'
import type { DescribeResult } from '@/hooks/useGameRewards'
import { LOGIC_HELP, LOGIC_LABEL } from '@/lib/copy'
import {
  CLASSIC_PRESETS,
  CUSTOM_LIMITS,
  difficultyOf,
  maxMinesFor,
  validateCustom,
} from '@/lib/modes/classic'
import type { ClassicDifficulty, ClassicPreset } from '@/lib/modes/classic'
import { useGameStore } from '@/store/useGameStore'

const PRESET_KEYS = Object.keys(CLASSIC_PRESETS) as ClassicPreset[]

const describeResult: DescribeResult = (s) => ({
  mode: 'classic',
  difficulty: difficultyOf(s.config),
})

export default function Classic() {
  const newGame = useGameStore((s) => s.newGame)
  const noGuess = useGameStore((s) => s.config.noGuess ?? true)
  const [difficulty, setDifficulty] = useState<ClassicDifficulty>(() =>
    difficultyOf(useGameStore.getState().config),
  )
  const [custom, setCustom] = useState(() => {
    const { width, height, mines } = useGameStore.getState().config
    return { width, height, mines }
  })
  const [errors, setErrors] = useState<string[]>([])
  const reward = useGameRewards(describeResult)
  const playing = useGameStore((s) => s.status === 'playing')
  // Cambio que descarta la partida en curso, esperando confirmación
  const [pending, setPending] = useState<(() => void) | null>(null)

  useConfirmLeave(playing ? 'Perderás la partida actual.' : null)

  /** Aplica `change` ya, o tras confirmar si hay una partida en juego. */
  const guard = (change: () => void) => {
    if (useGameStore.getState().status === 'playing') setPending(() => change)
    else change()
  }

  // Partida nueva al entrar (el store puede traer una de otro modo)
  useEffect(() => {
    const { config } = useGameStore.getState()
    const { width, height, mines } = config
    newGame({ width, height, mines, noGuess: config.noGuess ?? true })
  }, [newGame])

  const pickPreset = (key: ClassicPreset) =>
    guard(() => {
      setDifficulty(key)
      setErrors([])
      newGame({ ...CLASSIC_PRESETS[key].config, noGuess })
    })

  const applyCustom = (e: FormEvent) => {
    e.preventDefault()
    const res = validateCustom(custom)
    if (!res.ok) {
      setErrors(res.errors)
      return
    }
    setErrors([])
    guard(() => newGame({ ...res.config, noGuess }))
  }

  // El toggle refleja el store: si se cancela, no cambia
  const toggleNoGuess = (value: boolean) =>
    guard(() => newGame({ ...useGameStore.getState().config, noGuess: value }))

  const field = (key: keyof typeof custom, label: string, max: number) => (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={key === 'mines' ? CUSTOM_LIMITS.minMines : 5}
        max={max}
        value={Number.isNaN(custom[key]) ? '' : custom[key]}
        onChange={(e) =>
          setCustom((c) => ({ ...c, [key]: e.target.valueAsNumber }))
        }
        className="w-20 rounded-md bg-slate-900 px-2 py-1.5 font-mono text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-400"
      />
    </label>
  )

  return (
    <section className="flex w-full flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">Clásico</h1>

      <div
        role="tablist"
        aria-label="Dificultad"
        className="flex flex-wrap justify-center gap-2"
      >
        {PRESET_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={difficulty === key}
            onClick={() => pickPreset(key)}
            className={buttonClass(
              difficulty === key ? 'primary' : 'secondary',
            )}
          >
            {CLASSIC_PRESETS[key].label}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={difficulty === 'custom'}
          onClick={() => setDifficulty('custom')}
          className={buttonClass(
            difficulty === 'custom' ? 'primary' : 'secondary',
          )}
        >
          Personalizado
        </button>
      </div>

      <Toggle
        checked={noGuess}
        onChange={toggleNoGuess}
        label={LOGIC_LABEL}
        description={LOGIC_HELP}
      />

      {difficulty === 'custom' && (
        <form
          noValidate
          onSubmit={applyCustom}
          className="flex flex-col items-center gap-2 rounded-xl bg-slate-800 p-3"
        >
          <div className="flex flex-wrap items-end justify-center gap-3">
            {field('width', 'Ancho', CUSTOM_LIMITS.maxWidth)}
            {field('height', 'Alto', CUSTOM_LIMITS.maxHeight)}
            {field(
              'mines',
              'Minas',
              Math.max(maxMinesFor(custom.width || 0, custom.height || 0), 1),
            )}
            <Button type="submit" variant="primary">
              Jugar
            </Button>
          </div>
          {errors.length > 0 && (
            <ul role="alert" className="text-sm text-rose-400">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </form>
      )}

      <GameView mode="classic" />
      <ResultModal reward={reward} />
      <ConfirmModal
        open={pending !== null}
        title="¿Empezar un tablero nuevo?"
        message="Perderás la partida actual."
        confirmLabel="Reiniciar"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          pending?.()
          setPending(null)
        }}
      />
    </section>
  )
}
