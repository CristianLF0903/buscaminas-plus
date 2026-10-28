import { describe, expect, it } from 'vitest'
import { generateNoGuess } from '@/lib/engine/generate'
import { index } from '@/lib/engine/graph'
import { solve } from '@/lib/engine/solver'

const EASY = { width: 9, height: 9, mines: 10 }
const MEDIUM = { width: 16, height: 16, mines: 40 }

describe('generateNoGuess', () => {
  it('tableros generados se resuelven 100% con el solver', () => {
    for (const [config, seeds] of [
      [EASY, 30],
      [MEDIUM, 15],
    ] as const) {
      for (let s = 0; s < seeds; s++) {
        // Primer clic variado, incluidas esquinas
        const first = (s * 37) % (config.width * config.height)
        const res = generateNoGuess(config, `seed-${s}`, first)
        expect(res.guaranteed).toBe(true)
        expect(solve(res.board, first).solved).toBe(true)
        const mines = res.board.cells.filter((c) => c.mineWeight > 0)
        expect(mines).toHaveLength(config.mines)
      }
    }
  })

  it('es determinista: misma semilla → mismo tablero', () => {
    const first = index(4, 4, 9)
    const a = generateNoGuess(EASY, 'det', first)
    const b = generateNoGuess(EASY, 'det', first)
    expect(a).toEqual(b)
  })

  it('el primer clic y sus vecinos quedan libres', () => {
    const first = index(0, 0, 16)
    const { board } = generateNoGuess(MEDIUM, 7, first)
    for (const id of [first, ...board.neighbors[first]]) {
      expect(board.cells[id].mineWeight).toBe(0)
    }
  })

  it('sin intentos suficientes devuelve guaranteed: false', () => {
    // 39% de densidad: casi nunca se resuelve sin adivinar
    const dense = { width: 16, height: 16, mines: 99 }
    const res = generateNoGuess(dense, 'x', index(8, 8, 16), 3)
    expect(res.guaranteed).toBe(false)
    expect(res.attempts).toBe(3)
    expect(res.board.cells.filter((c) => c.mineWeight > 0)).toHaveLength(99)
  })

  it('respeta el límite de tiempo', () => {
    const dense = { width: 30, height: 16, mines: 170 }
    const res = generateNoGuess(dense, 'x', index(15, 8, 30), 500, 0)
    // Con límite 0 solo se hace el primer intento
    expect(res.attempts).toBe(1)
    expect(res.guaranteed).toBe(false)
  })

  it('funciona con minas dobles', () => {
    const config = { ...EASY, doubleMines: 3 }
    const first = index(4, 4, 9)
    const res = generateNoGuess(config, 'dobles', first)
    expect(res.guaranteed).toBe(true)
    expect(res.board.cells.filter((c) => c.mineWeight === 2)).toHaveLength(3)
  })
})
