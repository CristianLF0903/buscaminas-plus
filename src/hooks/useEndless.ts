import { useEffect, useState } from 'react'
import { createBoardQueue } from '@/lib/modes/boardQueue'
import type { PreparedBoard } from '@/lib/modes/boardQueue'
import {
  boardLost,
  boardSeed,
  boardWon,
  createRun,
  endlessConfig,
  endRun,
  nextBoard,
  startRun,
  TRANSITION_MS,
} from '@/lib/modes/endless'
import type { EndlessDifficulty, EndlessRun } from '@/lib/modes/endless'
import { useGameStore } from '@/store/useGameStore'
import { usePlayerStore } from '@/store/usePlayerStore'
import type { FinishedReward } from './useGameRewards'

interface Callbacks {
  onRun: (r: EndlessRun) => void
  onReward: (r: FinishedReward) => void
  onFirstReady: () => void
  /** El siguiente tablero tarda más que la transición. */
  onWaiting: (waiting: boolean) => void
}

/**
 * Una racha de infinito: encadena tableros en el store de partida y genera
 * el siguiente en el worker mientras se juega el actual.
 */
function createSession(
  difficulty: EndlessDifficulty,
  noGuess: boolean,
  runSeed: number,
  cb: Callbacks,
) {
  const config = endlessConfig(difficulty, noGuess)
  const queue = createBoardQueue(config, (n) => boardSeed(runSeed, n))
  let run = createRun()
  let transition: ReturnType<typeof setTimeout> | undefined
  // Desmontado: un `start` en vuelo ya no debe cargar su tablero
  let disposed = false

  const update = (next: EndlessRun) => {
    const prev = run
    run = next
    if (run === prev) return
    cb.onRun(run)
    if (run.status === 'over' && prev.status !== 'over') finish()
  }

  const finish = () => {
    clearTimeout(transition)
    const reward = usePlayerStore.getState().finishGame({
      mode: 'endless',
      difficulty,
      // Siempre termina perdiendo: se paga y se compite por tableros
      won: false,
      timeMs: (run.endedAt ?? 0) - (run.startedAt ?? 0),
      usedPowerUps: run.usedPowerUps,
      boards: run.solved,
    })
    cb.onReward(reward)
  }

  const play = (n: number, next: PreparedBoard) => {
    queue.drop(n - 1)
    useGameStore.getState().loadBoard(config, next.board, {
      seed: next.seed,
      firstClick: next.firstClick,
      guaranteed: next.guaranteed,
      // Límite de power-ups por tablero, pero el escudo pagado sigue activo
      keepShield: n > 1,
    })
    void queue.preload(n + 1)
  }

  /** Tras la transición, carga el siguiente (o espera a que se genere). */
  const advance = () => {
    const n = run.board + 1
    const ready = queue.get(n)
    if (!ready) cb.onWaiting(true)
    void queue.preload(n).then((next) => {
      cb.onWaiting(false)
      if (run.status !== 'between') return
      update(nextBoard(run))
      play(n, next)
    })
  }

  const onGame = (
    s: ReturnType<typeof useGameStore.getState>,
    prev: ReturnType<typeof useGameStore.getState>,
  ) => {
    if (run.status !== 'playing' || s.gameId !== prev.gameId) return
    if (s.status === prev.status) return
    if (s.status === 'won') {
      update(boardWon(run, s.usedPowerUps))
      transition = setTimeout(advance, TRANSITION_MS)
    } else if (s.status === 'lost') {
      update(boardLost(run, s.usedPowerUps, Date.now()))
    }
  }

  return {
    /** Suscribe al store y pre-genera el primero. Devuelve el cleanup. */
    mount() {
      disposed = false
      void queue.preload(1).then(() => cb.onFirstReady())
      const unsubscribe = useGameStore.subscribe(onGame)
      return () => {
        disposed = true
        unsubscribe()
        clearTimeout(transition)
        // Salir a mitad de racha la termina: cuenta lo resuelto
        const used = useGameStore.getState().usedPowerUps
        update(endRun(run, used, Date.now()))
      }
    },

    async start() {
      if (run.status !== 'idle') return
      const first = await queue.preload(1)
      if (disposed || run.status !== 'idle') return
      update(startRun(run, Date.now()))
      play(1, first)
    },
  }
}

export function useEndless(difficulty: EndlessDifficulty, noGuess: boolean) {
  const [run, setRun] = useState(createRun)
  const [reward, setReward] = useState<FinishedReward | null>(null)
  const [firstReady, setFirstReady] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [session] = useState(() =>
    createSession(difficulty, noGuess, Date.now(), {
      onRun: setRun,
      onReward: setReward,
      onFirstReady: () => setFirstReady(true),
      onWaiting: setWaiting,
    }),
  )

  useEffect(() => session.mount(), [session])

  return { run, reward, firstReady, waiting, start: session.start }
}
