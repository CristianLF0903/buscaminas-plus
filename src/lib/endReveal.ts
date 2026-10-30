import { coords } from '@/lib/engine/graph'
import type { Board } from '@/lib/engine/types'

/** Lo que tarda la onda en llegar a la mina más lejana. */
export const END_REVEAL_SPAN_MS = 1200
/** Duración de la animación de cada mina (`.cell-explode` en index.css). */
export const MINE_ANIM_MS = 350
/** Paso máximo entre anillos: en tableros chicos la onda no se arrastra. */
const MAX_STEP_MS = 60

/**
 * Tiempos de la onda que revela las minas al terminar, desde `centerId`
 * (la mina pisada o la última jugada). La distancia es Chebyshev, como en
 * el CSS: un anillo de celdas por paso.
 */
export function endRevealTiming(
  board: Board,
  centerId: number | null,
): { stepMs: number; totalMs: number } {
  const c = coords(centerId ?? 0, board.width)
  let far = 0
  for (const cell of board.cells) {
    if (!cell.mineWeight) continue
    const d = Math.max(Math.abs(cell.x - c.x), Math.abs(cell.y - c.y))
    if (d > far) far = d
  }
  const stepMs = far ? Math.min(MAX_STEP_MS, END_REVEAL_SPAN_MS / far) : 0
  return { stepMs, totalMs: Math.round(stepMs * far) + MINE_ANIM_MS }
}
