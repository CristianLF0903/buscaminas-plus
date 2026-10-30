import { index } from '@/lib/engine/graph'
import { createRng } from '@/lib/engine/rng'
import type { BoardConfig } from '@/lib/engine/types'

/** Tableros pequeños sin adivinar: se resuelven en segundos. */
export const TIME_ATTACK_CONFIG: BoardConfig = {
  width: 8,
  height: 8,
  mines: 10,
  noGuess: true,
}

export const START_MS = 60_000
export const MINE_PENALTY_MS = 10_000

/** Avisos visuales por debajo de este tiempo. */
export const LOW_TIME_MS = 10_000

/**
 * Segundos que suma el tablero resuelto número `n` (desde 1): 20 s los tres
 * primeros y 1 s menos cada tres tableros, con un mínimo de 10 s.
 */
export function solveBonusMs(n: number): number {
  return Math.max(10, 20 - Math.floor((n - 1) / 3)) * 1000
}

/** Semilla del tablero `n` de una sesión. */
export const boardSeed = (sessionSeed: number | string, n: number) =>
  `${sessionSeed}:ta:${n}`

/**
 * Primer clic fijo, derivado de la semilla: así el tablero se puede generar
 * antes de que el jugador haga clic. Lejos de los bordes para abrir área.
 */
export function boardFirstClick(seed: number | string): number {
  const { width, height } = TIME_ATTACK_CONFIG
  const rng = createRng(`${seed}:first`)
  const margin = 2
  const x = rng.int(margin, width - 1 - margin)
  const y = rng.int(margin, height - 1 - margin)
  return index(x, y, width)
}

export type SessionStatus = 'idle' | 'running' | 'paused' | 'over'

/**
 * Reloj de la sesión. El tiempo restante es `bankMs` menos lo transcurrido
 * desde `since`; cada cambio primero "congela" el reloj en `bankMs`.
 */
export interface TimeAttackSession {
  status: SessionStatus
  bankMs: number
  /** Desde cuándo corre el reloj; null si está parado. */
  since: number | null
  startedAt: number | null
  endedAt: number | null
  solved: number
  failed: number
}

export const createSession = (): TimeAttackSession => ({
  status: 'idle',
  bankMs: START_MS,
  since: null,
  startedAt: null,
  endedAt: null,
  solved: 0,
  failed: 0,
})

export function remainingMs(s: TimeAttackSession, now: number): number {
  const running = s.since === null ? 0 : now - s.since
  return Math.max(0, s.bankMs - running)
}

/** Congela el reloj en `now`, aplica `delta` y termina si llegó a 0. */
function settle(
  s: TimeAttackSession,
  now: number,
  delta = 0,
): TimeAttackSession {
  if (s.status !== 'running' && s.status !== 'paused') return s
  const bankMs = Math.max(0, remainingMs(s, now) + delta)
  if (bankMs === 0) {
    return { ...s, status: 'over', bankMs, since: null, endedAt: now }
  }
  return { ...s, bankMs, since: s.status === 'running' ? now : null }
}

export function startSession(
  s: TimeAttackSession,
  now: number,
): TimeAttackSession {
  if (s.status !== 'idle') return s
  return { ...s, status: 'running', since: now, startedAt: now }
}

/** Para el reloj mientras se espera un tablero que aún se está generando. */
export function pauseSession(
  s: TimeAttackSession,
  now: number,
): TimeAttackSession {
  if (s.status !== 'running') return s
  const next = settle(s, now)
  return next.status === 'over'
    ? next
    : { ...next, status: 'paused', since: null }
}

export function resumeSession(
  s: TimeAttackSession,
  now: number,
): TimeAttackSession {
  if (s.status !== 'paused') return s
  return { ...s, status: 'running', since: now }
}

export const boardSolved = (s: TimeAttackSession, now: number) => {
  if (s.status === 'over' || s.status === 'idle') return s
  const solved = s.solved + 1
  return settle({ ...s, solved }, now, solveBonusMs(solved))
}

export const boardFailed = (s: TimeAttackSession, now: number) => {
  if (s.status === 'over' || s.status === 'idle') return s
  return settle({ ...s, failed: s.failed + 1 }, now, -MINE_PENALTY_MS)
}

/** Tiempo+ y similares. */
export const addTime = (s: TimeAttackSession, now: number, ms: number) =>
  settle(s, now, ms)

/** Termina la sesión si el reloj llegó a 0. */
export const tick = (s: TimeAttackSession, now: number) =>
  s.status === 'running' && remainingMs(s, now) === 0
    ? { ...s, status: 'over' as const, bankMs: 0, since: null, endedAt: now }
    : s

/** Termina ya (salir de la página a mitad de sesión). */
export function endSession(
  s: TimeAttackSession,
  now: number,
): TimeAttackSession {
  if (s.status !== 'running' && s.status !== 'paused') return s
  return {
    ...s,
    status: 'over',
    bankMs: remainingMs(s, now),
    since: null,
    endedAt: now,
  }
}
