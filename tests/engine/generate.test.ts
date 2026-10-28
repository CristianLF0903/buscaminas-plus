import { describe, expect, it } from 'vitest'
import {
  computeAdjacent,
  createEmptyBoard,
  placeMines,
} from '@/lib/engine/generate'
import { index } from '@/lib/engine/graph'
import type { Board, Cell } from '@/lib/engine/types'

const weightSum = (board: Board) =>
  board.cells.reduce((sum, c) => sum + c.mineWeight, 0)

describe('createEmptyBoard', () => {
  it('crea un tablero vacío con vecinos', () => {
    const board = createEmptyBoard({ width: 9, height: 9, mines: 10 })
    expect(board.cells).toHaveLength(81)
    expect(weightSum(board)).toBe(0)
    expect(board.neighbors[index(4, 4, 9)]).toHaveLength(8)
    expect(board.mineCount).toBe(10)
  })

  it('lanza error si hay demasiadas minas', () => {
    expect(() => createEmptyBoard({ width: 4, height: 4, mines: 8 })).toThrow(
      /máximo es 7/,
    )
    expect(() =>
      createEmptyBoard({ width: 4, height: 4, mines: 7 }),
    ).not.toThrow()
  })

  it('las celdas sólidas y fuera de máscara no cuentan como jugables', () => {
    // 4x4 = 16, 2 sólidas => 14 jugables => máximo 5
    expect(() =>
      createEmptyBoard({ width: 4, height: 4, mines: 6, solids: [0, 1] }),
    ).toThrow(/máximo es 5/)
    const mask = Array.from({ length: 16 }, (_, id) => id !== 15)
    expect(() =>
      createEmptyBoard({ width: 4, height: 4, mines: 7, mask }),
    ).toThrow(/máximo es 6/)
  })

  it('lanza error si hay más minas dobles que minas', () => {
    expect(() =>
      createEmptyBoard({ width: 9, height: 9, mines: 5, doubleMines: 6 }),
    ).toThrow(/Minas dobles/)
  })
})

describe('placeMines', () => {
  const config = { width: 16, height: 16, mines: 40 }

  it('misma semilla y misma celda producen el mismo tablero', () => {
    const a = placeMines(createEmptyBoard(config), 'seed', 100)
    const b = placeMines(createEmptyBoard(config), 'seed', 100)
    expect(a).toEqual(b)
  })

  it('semillas distintas producen tableros distintos', () => {
    const a = placeMines(createEmptyBoard(config), 1, 100)
    const b = placeMines(createEmptyBoard(config), 2, 100)
    expect(a.cells.map((c) => c.mineWeight)).not.toEqual(
      b.cells.map((c) => c.mineWeight),
    )
  })

  it('la celda del primer clic y sus vecinos nunca tienen mina', () => {
    // Tablero casi lleno para forzar el caso límite
    const dense = { width: 9, height: 9, mines: 72 }
    for (let seed = 0; seed < 50; seed++) {
      const safeId = (seed * 7) % 81
      const board = placeMines(createEmptyBoard(dense), seed, safeId)
      expect(board.cells[safeId].mineWeight).toBe(0)
      for (const n of board.neighbors[safeId]) {
        expect(board.cells[n].mineWeight).toBe(0)
      }
    }
  })

  it('la suma de pesos coincide con la config', () => {
    const board = placeMines(createEmptyBoard(config), 5, 0)
    expect(weightSum(board)).toBe(40)
    expect(board.cells.filter((c) => c.mineWeight > 0)).toHaveLength(40)

    const doubles = { ...config, doubleMines: 6 }
    const withDoubles = placeMines(createEmptyBoard(doubles), 5, 0, 6)
    expect(withDoubles.cells.filter((c) => c.mineWeight > 0)).toHaveLength(40)
    expect(withDoubles.cells.filter((c) => c.mineWeight === 2)).toHaveLength(6)
    expect(weightSum(withDoubles)).toBe(46)
  })

  it('no coloca minas en celdas sólidas', () => {
    const solids = [0, 1, 2, 3, 4]
    const board = placeMines(
      createEmptyBoard({ width: 9, height: 9, mines: 67, solids }),
      3,
      40,
    )
    for (const id of solids) expect(board.cells[id].mineWeight).toBe(0)
    expect(weightSum(board)).toBe(67)
  })

  it('no muta el tablero original', () => {
    const empty = createEmptyBoard(config)
    placeMines(empty, 1, 0)
    expect(weightSum(empty)).toBe(0)
  })

  it('lanza error si el primer clic no es jugable', () => {
    const board = createEmptyBoard({
      width: 9,
      height: 9,
      mines: 10,
      solids: [0],
    })
    expect(() => placeMines(board, 1, 0)).toThrow(/no jugable/)
    expect(() => placeMines(board, 1, 999)).toThrow(/no jugable/)
  })
})

describe('computeAdjacent', () => {
  it('calcula adjacent en un tablero conocido', () => {
    // 3x3 con minas en (0,0) peso 1 y (2,2) peso 2:
    // * 1 0
    // 1 3 2
    // 0 2 *
    const empty = createEmptyBoard({ width: 3, height: 3, mines: 0 })
    const weights: Cell['mineWeight'][] = [1, 0, 0, 0, 0, 0, 0, 0, 2]
    const board = computeAdjacent({
      ...empty,
      cells: empty.cells.map((c) => ({ ...c, mineWeight: weights[c.id] })),
    })
    expect(board.cells.map((c) => c.adjacent)).toEqual([
      0, 1, 0, 1, 3, 2, 0, 2, 0,
    ])
  })
})
