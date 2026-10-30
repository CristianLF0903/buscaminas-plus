import { isPlayable } from '@/lib/engine/graph'
import { reveal, statusOf } from '@/lib/engine/reveal'
import type { MoveResult } from '@/lib/engine/reveal'
import { createKnowledge, step } from '@/lib/engine/solver'
import type { Board } from '@/lib/engine/types'

export const MAX_POWER_UPS_PER_GAME = 3
export const TIME_PLUS_MS = 15_000

/**
 * Radar: revela el 3×3 alrededor de `id` sin riesgo. Las minas quedan con
 * bandera y las banderas incorrectas del área se quitan.
 */
export function applyRadar(board: Board, id: number): MoveResult {
  const area = [id, ...board.neighbors[id]].filter((n) => isPlayable(board, n))
  const cells = board.cells.slice()
  for (const n of area) {
    const c = cells[n]
    if (c.revealed) continue
    const flagged = c.mineWeight > 0
    // La bandera queda con el peso real: el radar ya lo muestra
    const doubleFlag = c.mineWeight === 2
    if (c.flagged !== flagged || !!c.doubleFlag !== doubleFlag) {
      cells[n] = { ...c, flagged, doubleFlag }
    }
  }
  let next: Board = { ...board, cells }
  const revealedIds: number[] = []
  for (const n of area) {
    if (next.cells[n].mineWeight > 0) continue
    const res = reveal(next, n)
    next = res.board
    revealedIds.push(...res.revealedIds)
  }
  return { board: next, status: statusOf(next), revealedIds }
}

/**
 * Escudo: convierte una jugada perdedora en segura. Las minas que reveló se
 * vuelven a ocultar con bandera; el resto de lo revelado se mantiene.
 */
export function absorbMine(result: MoveResult): MoveResult {
  if (result.status !== 'lost') return result
  const cells = result.board.cells.slice()
  const saved: number[] = []
  for (const id of result.revealedIds) {
    if (cells[id].mineWeight > 0) {
      cells[id] = {
        ...cells[id],
        revealed: false,
        flagged: true,
        doubleFlag: cells[id].mineWeight === 2,
      }
      saved.push(id)
    }
  }
  const board = { ...result.board, cells }
  return {
    board,
    status: statusOf(board),
    revealedIds: result.revealedIds.filter((id) => !saved.includes(id)),
  }
}

/** Detector: si la celda oculta es mina. `null` si no aplica. */
export function detect(board: Board, id: number): boolean | null {
  const cell = board.cells[id]
  if (!cell || cell.revealed || !isPlayable(board, id)) return null
  return cell.mineWeight > 0
}

export interface Hint {
  id: number
  kind: 'safe' | 'mine'
  reason: string
}

/**
 * Pista: primera deducción útil del solver sobre lo visible (una celda
 * segura oculta o una mina sin bandera). `null` si la lógica no alcanza.
 */
export function findHint(board: Board): Hint | null {
  let k = createKnowledge(board)
  for (let guard = 0; guard < 100; guard++) {
    const res = step(board, k)
    if (!res) return null
    const safe = res.safe.find((id) => !board.cells[id].revealed)
    if (safe !== undefined)
      return { id: safe, kind: 'safe', reason: res.reason }
    const mine = res.mines.find((id) => !board.cells[id].flagged)
    if (mine !== undefined)
      return { id: mine, kind: 'mine', reason: res.reason }
    k = res.knowledge
  }
  return null
}
