import {
  createEmptyBoard,
  generateNoGuess,
  placeMines,
} from '@/lib/engine/generate'
import { index } from '@/lib/engine/graph'
import { createRng } from '@/lib/engine/rng'
import type { Board, BoardConfig } from '@/lib/engine/types'
import { generateNoGuessAsync } from '@/lib/engine/workerClient'

/**
 * Primer clic fijo, derivado de la semilla: así el tablero se puede generar
 * antes de que el jugador haga clic. Lejos de los bordes para abrir área.
 */
export function seededFirstClick(
  config: BoardConfig,
  seed: number | string,
): number {
  const { width, height } = config
  const rng = createRng(`${seed}:first`)
  const margin = 2
  const x = rng.int(margin, width - 1 - margin)
  const y = rng.int(margin, height - 1 - margin)
  return index(x, y, width)
}

/** Tablero minado listo para `useGameStore.loadBoard`. */
export interface PreparedBoard {
  board: Board
  seed: string
  firstClick: number
  /** `null` si el tablero no es sin adivinar. */
  guaranteed: boolean | null
}

/**
 * Tableros encadenados (contrarreloj, infinito): genera el `n` en el worker
 * mientras se juega el anterior. Cada promesa se crea una sola vez.
 */
export function createBoardQueue(
  config: BoardConfig,
  seedFor: (n: number) => string,
) {
  const pending = new Map<number, Promise<PreparedBoard>>()
  const ready = new Map<number, PreparedBoard>()

  const generate = async (n: number): Promise<PreparedBoard> => {
    const seed = seedFor(n)
    const firstClick = seededFirstClick(config, seed)
    if (!config.noGuess) {
      const empty = createEmptyBoard(config)
      const board = placeMines(empty, seed, firstClick, config.doubleMines)
      return { board, seed, firstClick, guaranteed: null }
    }
    const { board, guaranteed } = await generateNoGuessAsync(
      config,
      seed,
      firstClick,
    )
      // Sin worker: se genera en el hilo principal
      .catch(() => generateNoGuess(config, seed, firstClick))
    return { board, seed, firstClick, guaranteed }
  }

  return {
    preload(n: number): Promise<PreparedBoard> {
      let p = pending.get(n)
      if (!p) {
        p = generate(n).then((r) => {
          ready.set(n, r)
          return r
        })
        pending.set(n, p)
      }
      return p
    },

    /** El tablero `n` si ya terminó de generarse. */
    get: (n: number) => ready.get(n),

    /** Libera un tablero ya jugado. */
    drop(n: number) {
      ready.delete(n)
      pending.delete(n)
    },
  }
}
