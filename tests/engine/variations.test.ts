import { describe, expect, it } from 'vitest'
import {
  computeAdjacent,
  createEmptyBoard,
  generateNoGuess,
  placeMines,
} from '@/lib/engine/generate'
import { buildNeighbors, coords, index, isPlayable } from '@/lib/engine/graph'
import { chord, reveal, toggleFlag } from '@/lib/engine/reveal'
import { createRng } from '@/lib/engine/rng'
import { createKnowledge, solve, step } from '@/lib/engine/solver'
import type { Board, BoardConfig } from '@/lib/engine/types'
import { seededFirstClick } from '@/lib/modes/boardQueue'
import {
  applyVariations,
  shapeCross,
  shapeDiamond,
  shapeRandomHoles,
  shapeRect,
  shapeRing,
  VARIATIONS,
} from '@/lib/puzzle/variations'
import type { VariationId } from '@/lib/puzzle/variations'

const BASE: BoardConfig = { width: 12, height: 12, mines: 18 }
const SEEDS = ['a', 'b', 'c']

/** Todas las celdas jugables se alcanzan desde una (8 direcciones). */
function connected(config: BoardConfig): boolean {
  const { width, height, mask, wrap, solids } = config
  const neighbors = buildNeighbors({ width, height, mask, wrap, solids })
  const playable = neighbors
    .map((_, id) => id)
    .filter((id) => mask?.[id] !== false && !solids?.includes(id))
  const seen = new Set([playable[0]])
  const queue = [playable[0]]
  for (let i = 0; i < queue.length; i++) {
    for (const n of neighbors[queue[i]]) {
      if (!seen.has(n)) {
        seen.add(n)
        queue.push(n)
      }
    }
  }
  return seen.size === playable.length
}

function generate(config: BoardConfig, seed: string) {
  const first = seededFirstClick(config, seed)
  return { first, ...generateNoGuess(config, seed, first) }
}

describe('formas', () => {
  it('tienen el tamaño del tablero', () => {
    for (const shape of [shapeRect, shapeCross, shapeRing, shapeDiamond]) {
      expect(shape(12, 9)).toHaveLength(12 * 9)
    }
    expect(shapeRandomHoles(12, 9, createRng(1))).toHaveLength(12 * 9)
  })

  it('cruz: centro dentro, esquinas fuera', () => {
    const m = shapeCross(9, 9)
    expect(m[index(4, 4, 9)]).toBe(true)
    expect(m[index(4, 0, 9)]).toBe(true)
    expect(m[index(0, 0, 9)]).toBe(false)
  })

  it('anillo: centro fuera, bordes dentro', () => {
    const m = shapeRing(9, 9)
    expect(m[index(4, 4, 9)]).toBe(false)
    expect(m[index(0, 0, 9)]).toBe(true)
  })

  it('rombo: puntas dentro, esquinas fuera', () => {
    const m = shapeDiamond(9, 9)
    expect(m[index(4, 0, 9)]).toBe(true)
    expect(m[index(4, 4, 9)]).toBe(true)
    expect(m[index(0, 0, 9)]).toBe(false)
  })

  it('agujeros al azar: reproducibles y sin islas', () => {
    const a = shapeRandomHoles(12, 12, createRng('h'), 0.2)
    expect(shapeRandomHoles(12, 12, createRng('h'), 0.2)).toEqual(a)
    expect(a.filter((v) => !v).length).toBe(Math.round(144 * 0.2))
    expect(connected({ ...BASE, mask: a })).toBe(true)
  })
})

describe('variaciones', () => {
  it('son deterministas por semilla y no mutan la config', () => {
    const base = { ...BASE }
    const a = applyVariations(base, ['holes', 'solids'], 1)
    expect(applyVariations(base, ['holes', 'solids'], 1)).toEqual(a)
    expect(base).toEqual(BASE)
  })

  it('formas y bloques mantienen la densidad y el tablero conexo', () => {
    for (const id of ['cross', 'ring', 'diamond', 'holes', 'solids'] as const) {
      const config = applyVariations(BASE, [id], 'd')
      expect(connected(config)).toBe(true)
      const playable = createEmptyBoard(config).cells.filter((c) =>
        isPlayable(createEmptyBoard(config), c.id),
      ).length
      expect(config.mines / playable).toBeCloseTo(18 / 144, 1)
    }
  })

  // Requisito central: el generador sin adivinar funciona con cada una
  for (const id of Object.keys(VARIATIONS) as VariationId[]) {
    it(`${id}: tableros resolubles sin adivinar`, () => {
      const config = applyVariations(BASE, [id], id)
      for (const seed of SEEDS) {
        const { board, first, guaranteed } = generate(config, seed)
        expect(guaranteed).toBe(true)
        expect(solve(board, first).solved).toBe(true)
      }
    })
  }

  it.each([
    [['cross', 'doubleMines']],
    [['ring', 'fog', 'hints']],
    [['solids', 'wrap', 'flagLimit']],
    [['holes', 'doubleMines', 'fog']],
    [['diamond', 'solids', 'hints', 'flagLimit']],
  ] as VariationId[][][])('combinación %j es resoluble', (ids) => {
    const config = applyVariations(BASE, ids, ids.join())
    for (const seed of SEEDS) {
      const { board, first, guaranteed } = generate(config, seed)
      expect(guaranteed).toBe(true)
      expect(solve(board, first).solved).toBe(true)
    }
  })
})

describe('primer clic con formas', () => {
  it('cae en una celda con sus 8 vecinos jugables', () => {
    const config = applyVariations(BASE, ['ring', 'solids'], 'fc')
    const board = createEmptyBoard(config)
    for (let n = 0; n < 20; n++) {
      const id = seededFirstClick(config, `s${n}`)
      expect(isPlayable(board, id)).toBe(true)
      expect(board.neighbors[id]).toHaveLength(8)
    }
  })
})

/** Tablero a partir de un dibujo: `*` mina, `2` mina doble, `.` vacía. */
function boardFrom(rows: string[], doubleMines = 0): Board {
  const width = rows[0].length
  const height = rows.length
  const flat = [...rows.join('')]
  return computeAdjacent({
    width,
    height,
    doubleMines,
    neighbors: buildNeighbors({ width, height }),
    mineCount: flat.filter((ch) => ch !== '.').length,
    cells: flat.map((ch, id) => ({
      id,
      ...coords(id, width),
      mineWeight: ch === '2' ? 2 : ch === '*' ? 1 : 0,
      revealed: false,
      flagged: false,
      solid: false,
      fog: false,
      adjacent: 0,
    })),
  })
}

describe('minas dobles', () => {
  // 2 . .
  // . . .
  // . . *
  const rows = ['2..', '...', '..*']

  it('adjacent suma pesos', () => {
    const board = boardFrom(rows, 1)
    expect(board.cells[index(1, 1, 3)].adjacent).toBe(3)
    expect(board.cells[index(1, 0, 3)].adjacent).toBe(2)
  })

  it('la bandera cicla 🚩 → 🚩×2 → vacío', () => {
    let board = boardFrom(rows, 1)
    board = toggleFlag(board, 0).board
    expect(board.cells[0]).toMatchObject({ flagged: true, doubleFlag: false })
    board = toggleFlag(board, 0).board
    expect(board.cells[0]).toMatchObject({ flagged: true, doubleFlag: true })
    board = toggleFlag(board, 0).board
    expect(board.cells[0]).toMatchObject({ flagged: false, doubleFlag: false })
  })

  it('sin minas dobles la bandera solo alterna', () => {
    let board = boardFrom(['*..', '...'])
    board = toggleFlag(toggleFlag(board, 0).board, 0).board
    expect(board.cells[0].flagged).toBe(false)
  })

  it('el chording usa el peso de las banderas', () => {
    const center = index(1, 1, 3)
    let board = reveal(boardFrom(rows, 1), center).board
    board = toggleFlag(board, 8).board
    board = toggleFlag(board, 0).board
    // 🚩 + 🚩 = 2 ≠ 3: no abre
    expect(chord(board, center).board).toBe(board)
    board = toggleFlag(board, 0).board
    // 🚩×2 + 🚩 = 3: abre los vecinos
    const res = chord(board, center)
    expect(res.revealedIds.length).toBeGreaterThan(0)
    expect(res.status).toBe('won')
  })
})

describe('niebla', () => {
  const config = applyVariations(BASE, ['fog'], 'fog')

  it('solo en celdas con número y sin mina', () => {
    const board = placeMines(createEmptyBoard(config), 'f', 0)
    const fogged = board.cells.filter((c) => c.fog)
    expect(fogged.length).toBeGreaterThan(0)
    for (const c of fogged) {
      expect(c.mineWeight).toBe(0)
      expect(c.adjacent).toBeGreaterThan(0)
    }
  })

  it('el solver no usa los números con niebla', () => {
    // Tablero con todos los números en niebla: nada que deducir del entorno
    const board = placeMines(createEmptyBoard(config), 'f', 0)
    const allFog = {
      ...board,
      cells: board.cells.map((c) =>
        c.adjacent > 0 && !c.mineWeight ? { ...c, fog: true } : c,
      ),
    }
    expect(() => solve(allFog, 0)).not.toThrow()
    const opened = reveal(allFog, 0).board
    const k = createKnowledge(opened)
    const res = step(opened, k)
    // Solo puede deducir por el total de minas, nunca por un `?`
    expect(res?.reason ?? '').not.toMatch(/^El \d/)
  })

  it('el chording no funciona sobre una celda con niebla', () => {
    const board = placeMines(createEmptyBoard(config), 'f', 0)
    const fogId = board.cells.find((c) => c.fog)!.id
    const opened = reveal(board, fogId).board
    expect(chord(opened, fogId).board).toBe(opened)
  })
})

describe('pistas fijas', () => {
  const config = applyVariations(BASE, ['hints'], 'hints')

  it('empiezan reveladas, son seguras y tienen número', () => {
    const board = placeMines(createEmptyBoard(config), 'p', 0)
    const hints = board.cells.filter((c) => c.hint)
    expect(hints).toHaveLength(config.hints!)
    for (const c of hints) {
      expect(c.revealed).toBe(true)
      expect(c.mineWeight).toBe(0)
      expect(c.adjacent).toBeGreaterThan(0)
    }
  })

  it('el solver las usa desde el inicio', () => {
    // Mismos tableros (sin filtrar por resolubles) con y sin las pistas
    const dense = { ...config, mines: 30, hints: 8 }
    let withHints = 0
    let without = 0
    for (let n = 0; n < 30; n++) {
      const board = placeMines(createEmptyBoard(dense), `p${n}`, 0)
      const hidden = {
        ...board,
        cells: board.cells.map((c) =>
          c.hint ? { ...c, hint: false, revealed: false } : c,
        ),
      }
      if (solve(board, 0).solved) withHints++
      if (solve(hidden, 0).solved) without++
    }
    expect(withHints).toBeGreaterThan(without)
  })
})

describe('límite de banderas', () => {
  it('flagLimit = minas exactas', () => {
    const config = applyVariations(BASE, ['flagLimit'], 'fl')
    const board = createEmptyBoard(config)
    expect(board.flagLimit).toBe(config.mines)
  })
})
