import { useCallback, useEffect, useRef, useState } from 'react'
import { Redirect, useParams } from 'wouter'
import GameView from '@/components/board/GameView'
import PuzzleResult from '@/components/modals/PuzzleResult'
import TutorialModal from '@/components/modals/TutorialModal'
import Timer from '@/components/hud/Timer'
import { useConfirmLeave } from '@/hooks/useConfirmLeave'
import { useGameRewards } from '@/hooks/useGameRewards'
import type { DescribeResult } from '@/hooks/useGameRewards'
import { isUnlocked, parseLevel, starsFor } from '@/lib/modes/puzzle'
import {
  generateLevelAsync,
  getLevelConfig,
  getLevelMeta,
} from '@/lib/puzzle/levels'
import type { LevelBoard } from '@/lib/puzzle/levels'
import { formatTime } from '@/lib/time'
import { elapsedMs, useGameStore } from '@/store/useGameStore'
import { recordKey, usePlayerStore } from '@/store/usePlayerStore'
import Icon from '@/components/ui/Icon'

const RECORD = recordKey('puzzle', 'default')

function Level({ level }: { level: number }) {
  const meta = getLevelMeta(level)
  const { seed, firstClick, targetMs } = getLevelConfig(level)
  const stars = usePlayerStore((s) => s.records[RECORD]?.stars?.[level] ?? 0)
  const loadBoard = useGameStore((s) => s.loadBoard)
  const playing = useGameStore((s) => s.status === 'playing')
  const [prepared, setPrepared] = useState<LevelBoard | null>(null)
  const [started, setStarted] = useState(false)
  // Tutorial solo mientras el nivel no se ha completado
  const [tutorial, setTutorial] = useState(
    () => meta.introduces !== null && stars === 0,
  )
  // El callback de la generación necesita el valor actual
  const tutorialOpen = useRef(tutorial)
  // Estrellas al empezar la partida: las de después se marcan como nuevas
  const [prevStars, setPrevStars] = useState(stars)

  useConfirmLeave(playing ? 'Perderás el progreso de este nivel.' : null)

  const start = useCallback(
    (ready: LevelBoard) => {
      setPrevStars(
        usePlayerStore.getState().records[RECORD]?.stars?.[level] ?? 0,
      )
      // Mismo tablero en cada intento: el nivel es un puzzle fijo
      loadBoard(ready.config, ready.board, {
        seed,
        firstClick,
        guaranteed: ready.guaranteed,
      })
      setStarted(true)
    },
    [loadBoard, seed, firstClick, level],
  )

  useEffect(() => {
    let cancelled = false
    void generateLevelAsync(level).then((res) => {
      if (cancelled) return
      setPrepared(res)
      // Con tutorial, el reloj arranca al cerrarlo
      if (!tutorialOpen.current) start(res)
    })
    return () => {
      cancelled = true
    }
  }, [level, start])

  const closeTutorial = () => {
    tutorialOpen.current = false
    setTutorial(false)
    if (prepared && !started) start(prepared)
  }

  const describe = useCallback<DescribeResult>(
    (s) => ({
      mode: 'puzzle',
      difficulty: 'default',
      level,
      stars: starsFor({
        won: s.status === 'won',
        timeMs: elapsedMs(s.startedAt, s.endedAt, s.endedAt ?? 0),
        targetMs,
        usedPowerUps: s.usedPowerUps,
      }),
    }),
    [level, targetMs],
  )
  const reward = useGameRewards(describe)

  return (
    <section className="flex w-full flex-col items-center gap-3">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          {meta.boss && <Icon e="👑" className="mr-1" />}
          Nivel {level}
          {meta.boss && (
            <span className="ml-2 align-middle text-sm text-amber-300">
              Jefe
            </span>
          )}
        </h1>
        <p className="flex flex-wrap justify-center gap-1.5 pt-1 text-xs">
          {meta.mechanics.length ? (
            meta.mechanics.map((name) => (
              <span
                key={name}
                className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300"
              >
                {name}
              </span>
            ))
          ) : (
            <span className="text-slate-400">Clásico</span>
          )}
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
            <Icon e="🎯" /> {formatTime(targetMs)}
          </span>
        </p>
      </div>

      {started ? (
        <GameView mode="puzzle" allowReset={false} timer={<Timer />} />
      ) : (
        <p role="status" className="py-16 text-slate-400">
          Generando nivel…
        </p>
      )}

      {meta.introduces && (
        <TutorialModal
          mechanic={meta.introduces}
          open={tutorial}
          onClose={closeTutorial}
        />
      )}
      <PuzzleResult
        level={level}
        targetMs={targetMs}
        prevStars={prevStars}
        reward={reward}
        onRetry={() => prepared && start(prepared)}
      />
    </section>
  )
}

export default function PuzzleLevel() {
  const params = useParams<{ level: string }>()
  const maxLevel = usePlayerStore((s) => s.records[RECORD]?.maxLevel ?? 0)
  const level = parseLevel(params.level)

  // Nivel inválido o bloqueado (URL a mano): al selector
  if (level === null || !isUnlocked(level, maxLevel)) {
    return <Redirect to="/play/puzzle" replace />
  }
  return <Level key={level} level={level} />
}
