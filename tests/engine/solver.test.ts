import { describe, expect, it } from 'vitest'
import {
  computeAdjacent,
  createEmptyBoard,
  placeMines,
} from '@/lib/engine/generate'
import { buildNeighbors, coords, index } from '@/lib/engine/graph'
import { createKnowledge, solve, step } from '@/lib/engine/solver'
import type { Knowledge } from '@/lib/engine/solver'
import type { Board, Cell } from '@/lib/engine/types'

/**
 * Tablero desde un dibujo. Minas: `*` (peso 1), `@` (peso 2).
 * Celdas: `.` oculta, `o` revelada.
 */
function boardFrom(rows: string[]): Board {
  const width = rows[0].length
  const height = rows.length
  const flat = [...rows.join('')]
  return computeAdjacent({
    width,
    height,
    neighbors: buildNeighbors({ width, height }),
    mineCount: flat.filter((ch) => ch === '*' || ch === '@').length,
    cells: flat.map((ch, id) => ({
      id,
      ...coords(id, width),
      mineWeight: (ch === '*' ? 1 : ch === '@' ? 2 : 0) as Cell['mineWeight'],
      revealed: ch === 'o',
      flagged: false,
      solid: false,
      fog: false,
      adjacent: 0,
    })),
  })
}

/** Aplica `step` hasta que no haya más deducciones. */
function deduceAll(board: Board): Knowledge {
  let k = createKnowledge(board)
  for (let guard = 0; guard < 100; guard++) {
    const res = step(board, k)
    if (!res) return k
    k = res.knowledge
  }
  throw new Error('step no converge')
}

const safeIds = (k: Knowledge, board: Board) =>
  board.cells
    .filter((c) => !c.revealed && k.domains[c.id] === 1)
    .map((c) => c.id)

const mineIds = (k: Knowledge) =>
  k.domains.flatMap((d, id) => (d & 1 ? [] : [id]))

describe('step: patrones conocidos', () => {
  it('1-1 en borde', () => {
    // Fila revelada: 1 1 1 1 contra la pared inferior
    const board = boardFrom(['*..*', 'oooo'])
    const k = deduceAll(board)
    expect(mineIds(k)).toEqual([0, 3])
    expect(safeIds(k, board)).toEqual([1, 2])
  })

  it('1-2-1', () => {
    // Fila revelada: 1 1 2 1 1
    const board = boardFrom(['.*.*.', 'ooooo'])
    const k = deduceAll(board)
    expect(mineIds(k)).toEqual([1, 3])
    expect(safeIds(k, board)).toEqual([0, 2, 4])
  })

  it('1-2-2-1', () => {
    const board = boardFrom(['.**.', 'oooo'])
    const k = deduceAll(board)
    expect(mineIds(k)).toEqual([1, 2])
    expect(safeIds(k, board)).toEqual([0, 3])
  })

  it('la regla de subconjuntos explica la deducción', () => {
    // 1 1 en borde: {a,b} ⊂ {a,b,c} ⇒ c segura
    const board = boardFrom(['*..*', 'oooo'])
    const res = step(board, createKnowledge(board))!
    expect(res.safe.length + res.mines.length).toBeGreaterThan(0)
    expect(res.reason).toMatch(/\(\d+,\d+\)/)
  })

  it('regla trivial: mina forzada y número completo', () => {
    // El 1 en (1,2) solo ve (1,1) oculta ⇒ mina.
    // Luego el 1 en (2,1) ya tiene su mina ⇒ (3,1) segura.
    const board = boardFrom(['*o.', 'ooo'])
    const first = step(board, createKnowledge(board))!
    expect(first.mines).toEqual([0])
    expect(first.reason).toBe(
      'El 1 en (1,2) solo se completa si sus celdas ocultas son minas',
    )
    const second = step(board, first.knowledge)!
    expect(second.safe).toEqual([2])
    expect(second.reason).toBe('El 1 en (2,1) ya tiene todas sus minas')
  })

  it('sin información no deduce nada', () => {
    const board = boardFrom(['.*.', '...', '...'])
    expect(step(board, createKnowledge(board))).toBeNull()
  })

  it('no hay deducción en un 50/50 real', () => {
    // 1 1 con dos ocultas y una sola mina, sin más información
    const board = boardFrom(['*.', 'oo', 'oo'])
    expect(step(board, createKnowledge(board))).toBeNull()
  })
})

describe('step: minas dobles', () => {
  it('deduce el peso exacto de una mina doble', () => {
    // Fila revelada: 2 2 0 ⇒ (1,0),(2,0) seguras ⇒ (0,0) vale 2
    const board = boardFrom(['@..', 'ooo'])
    const k = deduceAll(board)
    expect(k.domains[0]).toBe(0b100)
    expect(safeIds(k, board)).toEqual([1, 2])
  })

  it('distingue minas simples y dobles por suma', () => {
    // Revelada: 3 3 1 0. El 0 ⇒ c = d = 0; el 1 ⇒ b = 1; el 3 ⇒ a = 2
    const board = boardFrom(['@*..', 'oooo'])
    const k = deduceAll(board)
    expect(k.domains[0]).toBe(0b100)
    expect(k.domains[1]).toBe(0b010)
  })
})

describe('solve', () => {
  it('tablero pequeño resoluble → solved: true', () => {
    const board = boardFrom(['*..', '...', '...'])
    const res = solve(board, index(2, 2, 3))
    expect(res.solved).toBe(true)
    expect(res.steps.length).toBeGreaterThan(0)
  })

  it('tablero que requiere adivinar → solved: false', () => {
    const board = boardFrom(['*.', '..', '..'])
    expect(solve(board, index(0, 2, 2)).solved).toBe(false)
  })

  it('usa el total de minas para celdas sin números vecinos', () => {
    // Fila 4 no toca ningún número: solo el total (1 mina, ya hallada)
    // permite saber que es segura
    const board = boardFrom(['*o', 'oo', '..', '..'])
    let k = createKnowledge(board)
    let last = ''
    for (let res = step(board, k); res; res = step(board, k)) {
      k = res.knowledge
      last = res.reason
    }
    expect(safeIds(k, board)).toEqual([4, 5, 6, 7])
    expect(last).toMatch(/^Quedan 0 de peso/)
  })

  it('primer clic en mina → solved: false', () => {
    const board = boardFrom(['*..', '...', '...'])
    expect(solve(board, 0).solved).toBe(false)
  })

  it('nunca deduce mal en tableros aleatorios', () => {
    const configs = [
      { width: 9, height: 9, mines: 10 },
      { width: 16, height: 16, mines: 40 },
      { width: 9, height: 9, mines: 10, doubleMines: 3 },
    ]
    for (const config of configs) {
      for (let seed = 0; seed < 30; seed++) {
        const first = index(4, 4, config.width)
        const board = placeMines(
          createEmptyBoard(config),
          seed,
          first,
          config.doubleMines,
        )
        // solve lanza si marca segura una mina
        const { steps } = solve(board, first)
        for (const s of steps) {
          for (const id of s.mines) {
            expect(board.cells[id].mineWeight).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('resuelve una buena parte de los tableros fáciles', () => {
    let solved = 0
    for (let seed = 0; seed < 50; seed++) {
      const config = { width: 9, height: 9, mines: 10 }
      const board = placeMines(createEmptyBoard(config), seed, 40)
      if (solve(board, 40).solved) solved++
    }
    // En fácil con clic central la mayoría no requiere adivinar
    expect(solved).toBeGreaterThan(25)
  })
})
