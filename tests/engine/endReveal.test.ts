import { describe, expect, it } from 'vitest'
import {
  END_REVEAL_SPAN_MS,
  endRevealTiming,
  MINE_ANIM_MS,
} from '@/lib/endReveal'
import { createEmptyBoard, placeMines } from '@/lib/engine/generate'
import { index } from '@/lib/engine/graph'

describe('endRevealTiming', () => {
  it('la onda dura como mucho el tramo fijo más la animación', () => {
    const empty = createEmptyBoard({ width: 30, height: 16, mines: 99 })
    const board = placeMines(empty, 'onda', 0)
    const { stepMs, totalMs } = endRevealTiming(board, 0)
    expect(stepMs).toBeGreaterThan(0)
    expect(totalMs).toBeLessThanOrEqual(END_REVEAL_SPAN_MS + MINE_ANIM_MS)
  })

  it('en tableros chicos el paso tiene tope', () => {
    const empty = createEmptyBoard({ width: 4, height: 4, mines: 1 })
    const cells = empty.cells.map((c) =>
      c.id === index(3, 3, 4) ? { ...c, mineWeight: 1 as const } : c,
    )
    const { stepMs, totalMs } = endRevealTiming({ ...empty, cells }, 0)
    expect(stepMs).toBe(60)
    expect(totalMs).toBe(3 * 60 + MINE_ANIM_MS)
  })

  it('sin minas lejos: solo la animación', () => {
    const empty = createEmptyBoard({ width: 4, height: 4, mines: 1 })
    const cells = empty.cells.map((c) =>
      c.id === 5 ? { ...c, mineWeight: 1 as const } : c,
    )
    expect(endRevealTiming({ ...empty, cells }, 5)).toEqual({
      stepMs: 0,
      totalMs: MINE_ANIM_MS,
    })
  })
})
