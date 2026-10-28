import { create } from 'zustand'
import { createEmptyBoard, placeMines } from '@/lib/engine/generate'
import * as engine from '@/lib/engine/reveal'
import type { MoveResult } from '@/lib/engine/reveal'
import type { Board, BoardConfig, GameStatus } from '@/lib/engine/types'

export interface GameState {
  config: BoardConfig
  seed: number | string
  /** La semilla vino de fuera (diario, puzzle): `reset` la conserva. */
  fixedSeed: boolean
  board: Board
  status: GameStatus
  startedAt: number | null
  endedAt: number | null
  flagsUsed: number
  /** Mina que hizo perder, para resaltarla. */
  explodedId: number | null

  newGame: (config: BoardConfig, seed?: number | string) => void
  reveal: (id: number) => void
  toggleFlag: (id: number) => void
  chord: (id: number) => void
  reset: () => void
}

const DEFAULT_CONFIG: BoardConfig = { width: 9, height: 9, mines: 10 }

const countFlags = (board: Board) =>
  board.cells.reduce((n, c) => n + (c.flagged ? 1 : 0), 0)

function initialState(config: BoardConfig, seed?: number | string) {
  return {
    config,
    // Única fuente de no-determinismo: el motor solo recibe la semilla
    seed: seed ?? Date.now(),
    fixedSeed: seed !== undefined,
    board: createEmptyBoard(config),
    status: 'idle' as GameStatus,
    startedAt: null,
    endedAt: null,
    flagsUsed: 0,
    explodedId: null,
  }
}

export const useGameStore = create<GameState>()((set, get) => {
  /** Aplica el resultado de una jugada y cierra la partida si terminó. */
  const apply = ({ board, status, revealedIds }: MoveResult) => {
    if (board === get().board) return
    const over = status === 'won' || status === 'lost'
    const lost = status === 'lost'
    set({
      board: lost ? engine.revealAllMines(board) : board,
      status,
      flagsUsed: countFlags(board),
      endedAt: over ? Date.now() : null,
      explodedId: lost
        ? (revealedIds.find((id) => board.cells[id].mineWeight > 0) ?? null)
        : null,
    })
  }

  return {
    ...initialState(DEFAULT_CONFIG),

    newGame: (config, seed) => set(initialState(config, seed)),

    reveal: (id) => {
      const { status, board, seed, config } = get()
      if (status === 'won' || status === 'lost') return
      if (status === 'idle') {
        // Primer clic: se colocan las minas evitando esta celda y sus vecinos
        if (!board.cells[id] || board.cells[id].flagged) return
        const mined = placeMines(board, seed, id, config.doubleMines)
        set({ board: mined, startedAt: Date.now() })
      }
      apply(engine.reveal(get().board, id))
    },

    toggleFlag: (id) => {
      const { status, board } = get()
      if (status === 'won' || status === 'lost') return
      const res = engine.toggleFlag(board, id)
      // Banderas antes del primer clic no inician la partida
      apply({ ...res, status })
    },

    chord: (id) => {
      if (get().status !== 'playing') return
      apply(engine.chord(get().board, id))
    },

    reset: () => {
      const { config, seed, fixedSeed } = get()
      set(initialState(config, fixedSeed ? seed : undefined))
    },
  }
})

export const selectMinesLeft = (s: GameState) => s.board.mineCount - s.flagsUsed

/** Milisegundos jugados. `now` se inyecta para poder testear. */
export function elapsedMs(
  startedAt: number | null,
  endedAt: number | null,
  now: number,
): number {
  if (startedAt === null) return 0
  return Math.max(0, (endedAt ?? now) - startedAt)
}

export const selectElapsed = (s: GameState, now = Date.now()) =>
  elapsedMs(s.startedAt, s.endedAt, now)
