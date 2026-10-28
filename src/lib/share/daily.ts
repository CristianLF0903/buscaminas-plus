import { isPlayable } from '@/lib/engine/graph'
import type { Board } from '@/lib/engine/types'
import { formatTime } from '@/lib/time'

export const GRID_SIZE = 5

/**
 * Resumen del progreso en una grilla de `size`×`size` zonas:
 * 🟩 zona despejada, 🟨 a medias, ⬛ sin tocar, 💥 donde explotó la mina.
 */
export function progressGrid(
  board: Board,
  explodedId: number | null,
  size = GRID_SIZE,
): string {
  const zone = (id: number) => {
    const c = board.cells[id]
    return (
      Math.floor((c.y * size) / board.height) * size +
      Math.floor((c.x * size) / board.width)
    )
  }
  const safe = new Array(size * size).fill(0)
  const open = new Array(size * size).fill(0)
  for (const c of board.cells) {
    if (!isPlayable(board, c.id) || c.mineWeight > 0) continue
    const z = zone(c.id)
    safe[z]++
    if (c.revealed) open[z]++
  }
  const boom = explodedId === null ? -1 : zone(explodedId)

  const rows: string[] = []
  for (let r = 0; r < size; r++) {
    let row = ''
    for (let col = 0; col < size; col++) {
      const z = r * size + col
      if (z === boom) row += '💥'
      else if (safe[z] > 0 && open[z] === safe[z]) row += '🟩'
      else if (open[z] > 0) row += '🟨'
      else row += safe[z] === 0 ? '🟩' : '⬛'
    }
    rows.push(row)
  }
  return rows.join('\n')
}

export interface DailyShare {
  number: number
  won: boolean
  timeMs?: number
  streak: number
  grid?: string
}

/** `Buscaminas+ #123 ✅ 2:41 🔥5` + grilla. */
export function shareText({ number, won, timeMs, streak, grid }: DailyShare) {
  const parts = [`Buscaminas+ #${number}`, won ? '✅' : '❌']
  if (won && timeMs !== undefined) parts.push(formatTime(timeMs))
  if (streak > 0) parts.push(`🔥${streak}`)
  return grid ? `${parts.join(' ')}\n${grid}` : parts.join(' ')
}
