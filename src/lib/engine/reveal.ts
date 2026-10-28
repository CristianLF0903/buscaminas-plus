import { isPlayable } from './generate'
import type { Board, Cell, GameStatus } from './types'

export interface MoveResult {
  board: Board
  status: GameStatus
  /** Celdas reveladas por esta jugada, en orden de apertura. */
  revealedIds: number[]
}

/** Todas las celdas jugables sin mina están reveladas. */
export function checkWin(board: Board): boolean {
  return board.cells.every(
    (c) => !isPlayable(board, c.id) || c.mineWeight > 0 || c.revealed,
  )
}

/** Estado derivado del tablero: perdido si hay una mina revelada. */
export function statusOf(board: Board): GameStatus {
  if (board.cells.some((c) => c.revealed && c.mineWeight > 0)) return 'lost'
  if (checkWin(board)) return 'won'
  return board.cells.some((c) => c.revealed) ? 'playing' : 'idle'
}

const unchanged = (board: Board): MoveResult => ({
  board,
  status: statusOf(board),
  revealedIds: [],
})

const isOver = (board: Board) => {
  const status = statusOf(board)
  return status === 'won' || status === 'lost'
}

/**
 * Revela `startIds` y expande los ceros con flood-fill (cola, sin recursión).
 * Copia solo las celdas que cambian.
 */
function open(board: Board, startIds: number[]): MoveResult {
  const cells = board.cells.slice()
  const revealedIds: number[] = []
  const queue: number[] = []

  const push = (id: number) => {
    const cell = cells[id]
    if (cell.revealed || cell.flagged || !isPlayable(board, id)) return
    cells[id] = { ...cell, revealed: true }
    revealedIds.push(id)
    queue.push(id)
  }

  startIds.forEach(push)
  for (let i = 0; i < queue.length; i++) {
    const cell = cells[queue[i]]
    if (cell.mineWeight === 0 && cell.adjacent === 0) {
      board.neighbors[cell.id].forEach(push)
    }
  }

  const next = { ...board, cells }
  return { board: next, status: statusOf(next), revealedIds }
}

export function reveal(board: Board, id: number): MoveResult {
  const cell = board.cells[id]
  if (!cell || cell.revealed || cell.flagged || isOver(board)) {
    return unchanged(board)
  }
  return open(board, [id])
}

/** Pone o quita bandera en una celda oculta. Respeta `flagLimit`. */
export function toggleFlag(board: Board, id: number): MoveResult {
  const cell = board.cells[id]
  if (!cell || cell.revealed || !isPlayable(board, id) || isOver(board)) {
    return unchanged(board)
  }
  if (!cell.flagged && board.flagLimit !== undefined) {
    const used = board.cells.filter((c) => c.flagged).length
    if (used >= board.flagLimit) return unchanged(board)
  }
  const cells = board.cells.slice()
  cells[id] = { ...cell, flagged: !cell.flagged }
  const next = { ...board, cells }
  return { board: next, status: statusOf(next), revealedIds: [] }
}

/**
 * Sobre una celda revelada con número: si las banderas vecinas igualan
 * `adjacent`, revela los vecinos ocultos sin bandera. Cada bandera cuenta 1:
 * sumar el peso real filtraría dónde están las minas dobles.
 */
export function chord(board: Board, id: number): MoveResult {
  const cell = board.cells[id]
  if (!cell || !cell.revealed || cell.adjacent === 0 || isOver(board)) {
    return unchanged(board)
  }
  const neighbors = board.neighbors[id]
  const flags = neighbors.filter((n) => board.cells[n].flagged).length
  if (flags !== cell.adjacent) return unchanged(board)
  return open(board, neighbors)
}

/** Revela todas las minas (al perder). Las banderas se mantienen. */
export function revealAllMines(board: Board): Board {
  const cells = board.cells.map((c): Cell =>
    c.mineWeight > 0 && !c.revealed ? { ...c, revealed: true } : c,
  )
  return { ...board, cells }
}
