import { buildNeighbors, coords, isPlayable, playableIds } from './graph'
import { createRng, hashString } from './rng'
import { solve } from './solver'
import type { Board, BoardConfig, Cell } from './types'

/** Tablero sin minas (estado `idle`). Las minas se colocan en el primer clic. */
export function createEmptyBoard(config: BoardConfig): Board {
  const {
    width,
    height,
    mines,
    mask,
    wrap,
    solids = [],
    doubleMines = 0,
  } = config
  if (width < 1 || height < 1) {
    throw new Error(`Tamaño inválido: ${width}x${height}`)
  }

  const solidSet = new Set(solids)
  const cells: Cell[] = Array.from({ length: width * height }, (_, id) => ({
    id,
    ...coords(id, width),
    mineWeight: 0,
    revealed: false,
    flagged: false,
    solid: solidSet.has(id),
    fog: false,
    adjacent: 0,
  }))

  const board: Board = {
    width,
    height,
    cells,
    neighbors: buildNeighbors({ width, height, mask, wrap, solids }),
    mask,
    mineCount: mines,
  }

  // -9: la celda del primer clic y sus 8 vecinos quedan libres
  const maxMines = playableIds(board).length - 9
  if (mines < 0 || mines > maxMines) {
    throw new Error(
      `Minas inválidas: ${mines}. Con este tablero el máximo es ${Math.max(maxMines, 0)}.`,
    )
  }
  if (doubleMines < 0 || doubleMines > mines) {
    throw new Error(
      `Minas dobles inválidas: ${doubleMines}. Deben estar entre 0 y ${mines}.`,
    )
  }
  return board
}

/** Suma de `mineWeight` de los vecinos de cada celda. */
export function computeAdjacent(board: Board): Board {
  const cells = board.cells.map((cell) => ({
    ...cell,
    adjacent: board.neighbors[cell.id].reduce(
      (sum, n) => sum + board.cells[n].mineWeight,
      0,
    ),
  }))
  return { ...board, cells }
}

/**
 * Coloca `board.mineCount` minas evitando `safeCellId` y sus vecinos.
 * Las primeras `doubleMines` del barajado reciben peso 2. No muta `board`.
 */
export function placeMines(
  board: Board,
  seed: number | string,
  safeCellId: number,
  doubleMines = 0,
): Board {
  if (!board.cells[safeCellId] || !isPlayable(board, safeCellId)) {
    throw new Error(`Celda de primer clic no jugable: ${safeCellId}`)
  }

  const safe = new Set([safeCellId, ...board.neighbors[safeCellId]])
  const candidates = playableIds(board).filter((id) => !safe.has(id))
  if (board.mineCount > candidates.length) {
    throw new Error(
      `No caben ${board.mineCount} minas fuera de la zona segura (${candidates.length} celdas libres).`,
    )
  }

  const chosen = createRng(seed).shuffle(candidates).slice(0, board.mineCount)
  const weights = new Map(chosen.map((id, i) => [id, i < doubleMines ? 2 : 1]))
  const cells = board.cells.map((cell): Cell => ({
    ...cell,
    mineWeight: (weights.get(cell.id) ?? 0) as Cell['mineWeight'],
  }))
  return computeAdjacent({ ...board, cells })
}

export interface NoGuessResult {
  board: Board
  /** false si se agotaron los intentos: el tablero puede requerir adivinar. */
  guaranteed: boolean
  attempts: number
}

/**
 * Genera tableros con semillas derivadas `hash(seed:i)` hasta que el solver
 * los resuelva sin adivinar desde `firstClick`. Determinista por semilla;
 * `timeLimitMs` corta antes en configs muy densas (solo afecta al caso sin
 * garantía, que depende entonces de la velocidad de la máquina).
 */
export function generateNoGuess(
  config: BoardConfig,
  seed: number | string,
  firstClick: number,
  maxAttempts = 500,
  timeLimitMs = Infinity,
): NoGuessResult {
  const empty = createEmptyBoard(config)
  const deadline = performance.now() + timeLimitMs
  let board = empty
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0 && performance.now() > deadline) {
      return { board, guaranteed: false, attempts: i }
    }
    board = placeMines(
      empty,
      hashString(`${seed}:${i}`),
      firstClick,
      config.doubleMines,
    )
    if (solve(board, firstClick).solved) {
      return { board, guaranteed: true, attempts: i + 1 }
    }
  }
  return { board, guaranteed: false, attempts: maxAttempts }
}
