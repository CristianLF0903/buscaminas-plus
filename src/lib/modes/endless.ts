import type { BoardConfig } from '@/lib/engine/types'
import { CLASSIC_PRESETS } from './classic'
import type { ClassicPreset } from './classic'

export type EndlessDifficulty = ClassicPreset

export const ENDLESS_DIFFICULTIES = Object.keys(
  CLASSIC_PRESETS,
) as EndlessDifficulty[]

/** Pausa entre tableros para mostrar el contador. */
export const TRANSITION_MS = 1200

export const endlessConfig = (
  difficulty: EndlessDifficulty,
  noGuess: boolean,
): BoardConfig => ({ ...CLASSIC_PRESETS[difficulty].config, noGuess })

/** Semilla del tablero `n` de una racha. */
export const boardSeed = (runSeed: number | string, n: number) =>
  `${runSeed}:en:${n}`

export type RunStatus = 'idle' | 'playing' | 'between' | 'over'

/**
 * Una racha de tableros. `between` es la transición tras ganar un tablero,
 * antes de cargar el siguiente.
 */
export interface EndlessRun {
  status: RunStatus
  /** Tablero en juego (desde 1); 0 antes de empezar. */
  board: number
  solved: number
  /** Power-ups de toda la racha (el límite de 3 es por tablero). */
  usedPowerUps: number
  startedAt: number | null
  endedAt: number | null
}

export const createRun = (): EndlessRun => ({
  status: 'idle',
  board: 0,
  solved: 0,
  usedPowerUps: 0,
  startedAt: null,
  endedAt: null,
})

export function startRun(r: EndlessRun, now: number): EndlessRun {
  if (r.status !== 'idle') return r
  return { ...r, status: 'playing', board: 1, startedAt: now }
}

/** Tablero ganado: suma y pasa a la transición. */
export function boardWon(r: EndlessRun, usedPowerUps: number): EndlessRun {
  if (r.status !== 'playing') return r
  return {
    ...r,
    status: 'between',
    solved: r.solved + 1,
    usedPowerUps: r.usedPowerUps + usedPowerUps,
  }
}

/** Siguiente tablero cargado. */
export function nextBoard(r: EndlessRun): EndlessRun {
  if (r.status !== 'between') return r
  return { ...r, status: 'playing', board: r.board + 1 }
}

/** Mina: fin de la racha. */
export function boardLost(
  r: EndlessRun,
  usedPowerUps: number,
  now: number,
): EndlessRun {
  if (r.status !== 'playing') return r
  return {
    ...r,
    status: 'over',
    usedPowerUps: r.usedPowerUps + usedPowerUps,
    endedAt: now,
  }
}

/**
 * Termina ya (salir de la página a mitad de racha). `usedPowerUps` son los
 * del tablero en juego; en la transición ya se contaron.
 */
export function endRun(
  r: EndlessRun,
  usedPowerUps: number,
  now: number,
): EndlessRun {
  if (r.status === 'playing') return boardLost(r, usedPowerUps, now)
  if (r.status === 'between') return { ...r, status: 'over', endedAt: now }
  return r
}
