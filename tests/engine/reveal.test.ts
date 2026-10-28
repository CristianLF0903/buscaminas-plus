import { describe, expect, it } from 'vitest'
import { computeAdjacent } from '@/lib/engine/generate'
import { buildNeighbors, coords, index } from '@/lib/engine/graph'
import {
  checkWin,
  chord,
  reveal,
  revealAllMines,
  statusOf,
  toggleFlag,
} from '@/lib/engine/reveal'
import type { Board } from '@/lib/engine/types'

/**
 * Tablero a partir de un dibujo: `*` mina, `#` sólida, `.` vacía.
 * No usa `createEmptyBoard` para permitir tableros menores que su mínimo.
 */
function boardFrom(rows: string[], flagLimit?: number): Board {
  const width = rows[0].length
  const height = rows.length
  const flat = [...rows.join('')]
  const solids = flat.flatMap((ch, id) => (ch === '#' ? [id] : []))
  return computeAdjacent({
    width,
    height,
    flagLimit,
    neighbors: buildNeighbors({ width, height, solids }),
    mineCount: flat.filter((ch) => ch === '*').length,
    cells: flat.map((ch, id) => ({
      id,
      ...coords(id, width),
      mineWeight: ch === '*' ? 1 : 0,
      revealed: false,
      flagged: false,
      solid: ch === '#',
      fog: false,
      adjacent: 0,
    })),
  })
}

const revealedMap = (board: Board) =>
  board.cells.map((c) => (c.revealed ? 'o' : '-')).join('')

describe('reveal', () => {
  // 5x4, mina en (4,3):
  // 0 0 0 0 0
  // 0 0 0 0 0
  // 0 0 0 1 1
  // 0 0 0 1 *
  const rows = ['.....', '.....', '.....', '....*']

  it('flood-fill abre el área de ceros y su borde numérico', () => {
    const board = boardFrom(rows)
    const res = reveal(board, 0)
    expect(res.status).toBe('won')
    expect(revealedMap(res.board)).toBe('ooooo' + 'ooooo' + 'ooooo' + 'oooo-')
    expect(res.revealedIds).toHaveLength(19)
    expect(new Set(res.revealedIds).size).toBe(19)
  })

  it('no cruza celdas sólidas', () => {
    // La columna sólida corta el área; solo se abre el lado izquierdo
    const board = boardFrom(['.#..', '.#..', '.#.*'])
    const res = reveal(board, 0)
    expect(revealedMap(res.board)).toBe('o---o---o---')
    expect(res.status).toBe('playing')
  })

  it('revelar un número solo abre esa celda', () => {
    const board = boardFrom(rows)
    const res = reveal(board, index(3, 3, 5))
    expect(res.revealedIds).toEqual([index(3, 3, 5)])
    expect(res.status).toBe('playing')
  })

  it('revelar una mina hace perder', () => {
    const res = reveal(boardFrom(rows), index(4, 3, 5))
    expect(res.status).toBe('lost')
  })

  it('no se puede revelar una celda con bandera', () => {
    const flagged = toggleFlag(boardFrom(rows), 0).board
    const res = reveal(flagged, 0)
    expect(res.revealedIds).toEqual([])
    expect(res.board).toBe(flagged)
  })

  it('el flood-fill no abre celdas con bandera', () => {
    const flagged = toggleFlag(boardFrom(rows), index(4, 0, 5)).board
    const res = reveal(flagged, 0)
    expect(res.board.cells[index(4, 0, 5)].revealed).toBe(false)
    expect(res.status).toBe('playing')
  })

  it('no muta el tablero de entrada', () => {
    const board = boardFrom(rows)
    const before = JSON.stringify(board)
    reveal(board, 0)
    expect(JSON.stringify(board)).toBe(before)
  })

  it('ignora jugadas con la partida terminada', () => {
    const lost = reveal(boardFrom(rows), index(4, 3, 5)).board
    const res = reveal(lost, 0)
    expect(res.board).toBe(lost)
    expect(res.status).toBe('lost')
  })
})

describe('victoria', () => {
  it('se detecta al revelar la última celda segura', () => {
    // * 1
    // 1 1
    let board = boardFrom(['*.', '..'])
    for (const id of [1, 2]) {
      const res = reveal(board, id)
      expect(res.status).toBe('playing')
      board = res.board
    }
    expect(checkWin(board)).toBe(false)
    const res = reveal(board, 3)
    expect(res.status).toBe('won')
    expect(checkWin(res.board)).toBe(true)
  })
})

describe('toggleFlag', () => {
  it('pone y quita bandera', () => {
    const board = boardFrom(['*.', '..'])
    const on = toggleFlag(board, 0).board
    expect(on.cells[0].flagged).toBe(true)
    expect(toggleFlag(on, 0).board.cells[0].flagged).toBe(false)
  })

  it('no aplica a celdas reveladas ni sólidas', () => {
    const board = reveal(boardFrom(['*.#', '...']), 1).board
    expect(toggleFlag(board, 1).board).toBe(board)
    expect(toggleFlag(board, 2).board).toBe(board)
  })

  it('respeta flagLimit pero permite quitar banderas', () => {
    let board = boardFrom(['*..', '...'], 1)
    board = toggleFlag(board, 0).board
    expect(toggleFlag(board, 1).board).toBe(board)
    board = toggleFlag(board, 0).board
    expect(board.cells[0].flagged).toBe(false)
  })
})

describe('chord', () => {
  // * 1 0
  // 1 1 0
  // 0 0 0
  const rows = ['*..', '...', '...']

  it('con banderas correctas revela los vecinos', () => {
    let board = reveal(boardFrom(rows), 1).board
    board = toggleFlag(board, 0).board
    const res = chord(board, 1)
    expect(res.status).toBe('won')
    expect(res.board.cells.every((c) => c.revealed || c.id === 0)).toBe(true)
  })

  it('con banderas incorrectas hace perder', () => {
    let board = reveal(boardFrom(rows), 1).board
    board = toggleFlag(board, 3).board
    const res = chord(board, 1)
    expect(res.status).toBe('lost')
    expect(res.board.cells[0].revealed).toBe(true)
  })

  it('no hace nada si faltan banderas', () => {
    const board = reveal(boardFrom(rows), 1).board
    expect(chord(board, 1).board).toBe(board)
  })

  it('no hace nada sobre celdas ocultas o ceros', () => {
    const board = boardFrom(rows)
    expect(chord(board, 1).board).toBe(board)
    const opened = reveal(board, 8).board
    expect(chord(opened, 8).board).toBe(opened)
  })
})

describe('revealAllMines / statusOf', () => {
  it('revela todas las minas y mantiene banderas', () => {
    let board = boardFrom(['*.*', '...'])
    board = toggleFlag(board, 0).board
    const shown = revealAllMines(board)
    expect(shown.cells[0].revealed).toBe(true)
    expect(shown.cells[0].flagged).toBe(true)
    expect(shown.cells[2].revealed).toBe(true)
    expect(shown.cells[1].revealed).toBe(false)
  })

  it('tablero sin revelar está en idle', () => {
    expect(statusOf(boardFrom(['*.', '..']))).toBe('idle')
  })
})
