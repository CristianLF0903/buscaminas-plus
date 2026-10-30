import { useEffect, useState } from 'react'
import { generateNoGuess } from '@/lib/engine/generate'
import type { NoGuessResult } from '@/lib/engine/generate'
import { generateNoGuessAsync } from '@/lib/engine/workerClient'
import {
  addTime,
  boardFailed,
  boardFirstClick,
  boardSeed,
  boardSolved,
  createSession,
  endSession,
  MINE_PENALTY_MS,
  pauseSession,
  remainingMs,
  resumeSession,
  solveBonusMs,
  startSession,
  tick,
  TIME_ATTACK_CONFIG,
} from '@/lib/modes/timeAttack'
import type { TimeAttackSession } from '@/lib/modes/timeAttack'
import { useGameStore } from '@/store/useGameStore'
import { usePlayerStore } from '@/store/usePlayerStore'
import type { FinishedReward } from './useGameRewards'

const TICK_MS = 100

/** Último cambio de tiempo (+bonus, −penalización), para animarlo. */
export interface TimeChange {
  id: number
  ms: number
}

interface RunCallbacks {
  onSession: (s: TimeAttackSession) => void
  onBoard: (n: number) => void
  onChange: (c: TimeChange) => void
  onReward: (r: FinishedReward) => void
  onFirstReady: () => void
}

/**
 * Una sesión de contrarreloj: encadena tableros en el store de partida y
 * genera el siguiente en el worker mientras se juega el actual.
 */
function createRun(sessionSeed: number, cb: RunCallbacks) {
  let session = createSession()
  let current = 0
  let changeId = 0
  const pending = new Map<number, Promise<NoGuessResult>>()
  const ready = new Map<number, NoGuessResult>()

  const update = (
    fn: (s: TimeAttackSession, now: number) => TimeAttackSession,
  ) => {
    const prev = session
    session = fn(prev, Date.now())
    if (session === prev) return
    cb.onSession(session)
    if (session.status === 'over' && prev.status !== 'over') finish()
  }

  const finish = () => {
    const reward = usePlayerStore.getState().finishGame({
      mode: 'timeAttack',
      difficulty: 'default',
      // Siempre termina por tiempo: se paga y se compite por tableros
      won: false,
      timeMs: (session.endedAt ?? 0) - (session.startedAt ?? 0),
      usedPowerUps: useGameStore.getState().usedPowerUps,
      boards: session.solved,
    })
    cb.onReward(reward)
  }

  const flash = (ms: number) => cb.onChange({ id: ++changeId, ms })

  const preload = (n: number) => {
    let p = pending.get(n)
    if (!p) {
      const seed = boardSeed(sessionSeed, n)
      const first = boardFirstClick(seed)
      p = generateNoGuessAsync(TIME_ATTACK_CONFIG, seed, first)
        // Sin worker: 8×8 es lo bastante chico para el hilo principal
        .catch(() => generateNoGuess(TIME_ATTACK_CONFIG, seed, first))
        .then((r) => {
          ready.set(n, r)
          return r
        })
      pending.set(n, p)
    }
    return p
  }

  const play = (n: number, result: NoGuessResult) => {
    current = n
    ready.delete(n - 1)
    pending.delete(n - 1)
    const seed = boardSeed(sessionSeed, n)
    useGameStore.getState().loadBoard(TIME_ATTACK_CONFIG, result.board, {
      seed,
      firstClick: boardFirstClick(seed),
      guaranteed: result.guaranteed,
      carry: n > 1,
    })
    cb.onBoard(n)
    void preload(n + 1)
  }

  const advance = () => {
    if (session.status !== 'running') return
    const n = current + 1
    const result = ready.get(n)
    if (result) {
      play(n, result)
      return
    }
    // Aún generándose: el reloj se para hasta que llegue
    update(pauseSession)
    void preload(n).then((r) => {
      if (session.status !== 'paused') return
      play(n, r)
      update(resumeSession)
    })
  }

  const onGame = (
    s: ReturnType<typeof useGameStore.getState>,
    prev: ReturnType<typeof useGameStore.getState>,
  ) => {
    if (session.status !== 'running' || s.gameId !== prev.gameId) return
    if (s.timeBonusMs > prev.timeBonusMs) {
      const ms = s.timeBonusMs - prev.timeBonusMs
      update((x, now) => addTime(x, now, ms))
      flash(ms)
    }
    if (s.status === prev.status) return
    if (s.status === 'won') {
      update(boardSolved)
      flash(solveBonusMs(session.solved))
    } else if (s.status === 'lost') {
      update(boardFailed)
      flash(-MINE_PENALTY_MS)
    } else {
      return
    }
    // Fuera del listener: loadBoard vuelve a notificar al store
    queueMicrotask(advance)
  }

  return {
    /** Suscribe al store y pre-genera el primero. Devuelve el cleanup. */
    mount() {
      void preload(1).then(() => cb.onFirstReady())
      const unsubscribe = useGameStore.subscribe(onGame)
      const timer = setInterval(() => update(tick), TICK_MS)
      return () => {
        unsubscribe()
        clearInterval(timer)
        // Salir a mitad de sesión la termina: cuenta lo resuelto
        update(endSession)
      }
    },

    async start() {
      if (session.status !== 'idle') return
      const first = await preload(1)
      if (session.status !== 'idle') return
      update(startSession)
      play(1, first)
    },
  }
}

export function useTimeAttack() {
  const [session, setSession] = useState(createSession)
  const [board, setBoard] = useState(0)
  const [change, setChange] = useState<TimeChange | null>(null)
  const [reward, setReward] = useState<FinishedReward | null>(null)
  const [firstReady, setFirstReady] = useState(false)
  const [run] = useState(() =>
    createRun(Date.now(), {
      onSession: setSession,
      onBoard: setBoard,
      onChange: setChange,
      onReward: setReward,
      onFirstReady: () => setFirstReady(true),
    }),
  )
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => run.mount(), [run])

  useEffect(() => {
    if (session.status !== 'running') return
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [session.status])

  return {
    session,
    // `now` puede ser anterior al último cambio del reloj
    remaining: remainingMs(session, Math.max(now, session.since ?? now)),
    board,
    change,
    reward,
    firstReady,
    start: run.start,
  }
}
