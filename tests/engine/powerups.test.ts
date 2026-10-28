import { describe, expect, it } from 'vitest'
import { computeAdjacent } from '@/lib/engine/generate'
import { buildNeighbors, coords, index } from '@/lib/engine/graph'
import { reveal, toggleFlag } from '@/lib/engine/reveal'
import { absorbMine, applyRadar, detect, findHint } from '@/lib/powerups'
import type { Board } from '@/lib/engine/types'

/** `*` mina, `o` revelada, `.` oculta. */
function boardFrom(rows: string[]): Board {
  const width = rows[0].length
  const height = rows.length
  const flat = [...rows.join('')]
  return computeAdjacent({
    width,
    height,
    neighbors: buildNeighbors({ width, height }),
    mineCount: flat.filter((ch) => ch === '*').length,
    cells: flat.map((ch, id) => ({
      id,
      ...coords(id, width),
      mineWeight: ch === '*' ? 1 : 0,
      revealed: ch === 'o',
      flagged: false,
      solid: false,
      fog: false,
      adjacent: 0,
    })),
  })
}

describe('Radar', () => {
  // 5x5, minas en (1,1) y (3,3)
  const rows = ['.....', '.*...', '.....', '...*.', '.....']

  it('revela el 3×3 y marca las minas con bandera, sin perder', () => {
    const board = boardFrom(rows)
    const res = applyRadar(board, index(1, 1, 5))
    expect(res.status).not.toBe('lost')
    const mine = res.board.cells[index(1, 1, 5)]
    expect(mine.flagged).toBe(true)
    expect(mine.revealed).toBe(false)
    for (const n of board.neighbors[index(1, 1, 5)]) {
      expect(res.board.cells[n].revealed).toBe(true)
    }
  })

  it('quita banderas incorrectas del área', () => {
    let board = boardFrom(rows)
    board = toggleFlag(board, index(2, 2, 5)).board
    const res = applyRadar(board, index(2, 2, 5))
    expect(res.board.cells[index(2, 2, 5)].flagged).toBe(false)
    expect(res.board.cells[index(2, 2, 5)].revealed).toBe(true)
    expect(res.board.cells[index(3, 3, 5)].flagged).toBe(true)
  })

  it('en una esquina solo cubre celdas existentes y puede ganar', () => {
    const board = boardFrom(['*.', '..'])
    const res = applyRadar(board, 0)
    expect(res.status).toBe('won')
  })
})

describe('Escudo', () => {
  it('convierte la derrota en mina marcada y sigue jugando', () => {
    const board = boardFrom(['*..', '...', '..*'])
    const lost = reveal(reveal(board, index(2, 0, 3)).board, 0)
    expect(lost.status).toBe('lost')
    const saved = absorbMine(lost)
    expect(saved.status).toBe('playing')
    expect(saved.board.cells[0]).toMatchObject({
      revealed: false,
      flagged: true,
    })
    expect(saved.revealedIds).not.toContain(0)
  })

  it('no toca jugadas que no pierden', () => {
    const board = boardFrom(['*..', '...', '...'])
    const res = reveal(board, 8)
    expect(absorbMine(res)).toBe(res)
  })
})

describe('Detector', () => {
  it('indica si una celda oculta es mina', () => {
    const board = boardFrom(['*.', 'o.'])
    expect(detect(board, 0)).toBe(true)
    expect(detect(board, 1)).toBe(false)
  })

  it('no aplica sobre celdas reveladas o inexistentes', () => {
    const board = boardFrom(['*.', 'o.'])
    expect(detect(board, 2)).toBeNull()
    expect(detect(board, 99)).toBeNull()
  })
})

describe('Pista', () => {
  it('encuentra una deducción con su razón', () => {
    // El 1 en (1,2) solo ve (1,1) ⇒ mina
    const board = boardFrom(['*o.', 'ooo'])
    expect(findHint(board)).toEqual({
      id: 0,
      kind: 'mine',
      reason: 'El 1 en (1,2) solo se completa si sus celdas ocultas son minas',
    })
  })

  it('salta minas ya marcadas y sugiere la celda segura', () => {
    const board = toggleFlag(boardFrom(['*o.', 'ooo']), 0).board
    const hint = findHint(board)
    expect(hint?.id).toBe(2)
    expect(hint?.kind).toBe('safe')
  })

  it('null si no hay deducción lógica', () => {
    expect(findHint(boardFrom(['*.', 'oo', 'oo']))).toBeNull()
  })
})
