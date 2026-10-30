import { describe, expect, it, vi } from 'vitest'
import { createEmptyBoard } from '@/lib/engine/generate'
import { isPlayable } from '@/lib/engine/graph'
import {
  CURVE,
  generateLevel,
  getLevelConfig,
  getLevelMeta,
  isBoss,
  UNLOCKS,
} from '@/lib/puzzle/levels'
import type { Mechanic } from '@/lib/puzzle/levels'

const LEVELS = Array.from({ length: 120 }, (_, i) => i + 1)
const INTROS = new Map(
  (Object.entries(UNLOCKS) as [Mechanic, number][]).map(([m, n]) => [n, m]),
)

const playable = (n: number) => {
  const board = createEmptyBoard(getLevelConfig(n).config)
  return board.cells.filter((c) => isPlayable(board, c.id)).length
}

describe('getLevelConfig', () => {
  it('es determinista (también sin caché)', async () => {
    const a = getLevelConfig(37)
    vi.resetModules()
    const fresh = await import('@/lib/puzzle/levels')
    expect(fresh.getLevelConfig(37)).toEqual(a)
    expect(getLevelConfig(37)).toBe(a)
  })

  it('niveles distintos, tableros distintos', () => {
    expect(getLevelConfig(12).seed).not.toBe(getLevelConfig(13).seed)
  })

  it('rechaza niveles inválidos', () => {
    expect(() => getLevelConfig(0)).toThrow()
    expect(() => getLevelConfig(1.5)).toThrow()
  })

  it('nivel 1: clásico 6×6 al 12%', () => {
    const { config, mechanics } = getLevelConfig(1)
    expect(config).toMatchObject({ width: 6, height: 6, noGuess: true })
    expect(config.mines / 36).toBeCloseTo(CURVE.minDensity, 1)
    expect(mechanics).toEqual([])
  })

  it('el tamaño crece hasta 24×20 y la densidad no pasa el tope', () => {
    let prev = { width: 0, height: 0 }
    for (const n of LEVELS.filter((n) => !isBoss(n))) {
      const { width, height, mines } = getLevelConfig(n).config
      expect(width).toBeGreaterThanOrEqual(prev.width)
      expect(height).toBeGreaterThanOrEqual(prev.height)
      expect(width).toBeLessThanOrEqual(CURVE.maxWidth)
      expect(height).toBeLessThanOrEqual(CURVE.maxHeight)
      expect(mines / playable(n)).toBeLessThanOrEqual(CURVE.maxDensity + 0.01)
      prev = { width, height }
    }
    expect(getLevelConfig(100).config).toMatchObject({ width: 24, height: 20 })
  })
})

describe('mecánicas', () => {
  it('1–4 son clásicos', () => {
    for (const n of [1, 2, 3, 4])
      expect(getLevelConfig(n).mechanics).toEqual([])
  })

  it('el nivel de introducción trae solo la mecánica nueva', () => {
    for (const [n, mechanic] of INTROS) {
      expect(getLevelConfig(n).mechanics).toEqual([mechanic])
      expect(getLevelMeta(n).introduces).toBe(mechanic)
    }
  })

  it('solo aparecen mecánicas ya desbloqueadas', () => {
    for (const n of LEVELS) {
      for (const m of getLevelConfig(n).mechanics) {
        expect(UNLOCKS[m]).toBeLessThanOrEqual(n)
      }
    }
  })

  it('niveles normales: 1–2 mecánicas tras el nivel 5', () => {
    for (const n of LEVELS.filter((n) => n > 5 && !isBoss(n))) {
      const count = getLevelConfig(n).mechanics.length
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(2)
    }
  })

  it('jefes: múltiplos de 10 sin introducción, 3+ mecánicas y más grandes', () => {
    expect(isBoss(10)).toBe(false) // presenta las formas
    expect(isBoss(40)).toBe(true)
    expect(isBoss(41)).toBe(false)
    for (const n of LEVELS.filter(isBoss)) {
      const { config, mechanics } = getLevelConfig(n)
      expect(mechanics.length).toBeGreaterThanOrEqual(3)
      const normal = getLevelConfig(n - 1).config
      expect(config.width * config.height).toBeGreaterThanOrEqual(
        normal.width * normal.height,
      )
      expect(getLevelMeta(n).boss).toBe(true)
    }
  })
})

describe('getLevelMeta', () => {
  it('nombres de mecánicas para la UI', () => {
    expect(getLevelMeta(5).mechanics).toEqual(['Bloques'])
    expect(getLevelMeta(10).mechanics).toEqual(['Formas'])
    expect(getLevelMeta(3)).toMatchObject({
      mechanics: [],
      boss: false,
      introduces: null,
    })
  })

  it('tiempo objetivo: múltiplo de 5 s y crece con el tablero', () => {
    const t1 = getLevelMeta(1).targetMs
    expect(t1 % 5000).toBe(0)
    expect(getLevelMeta(60).targetMs).toBeGreaterThan(t1)
  })
})

describe('generateLevel', () => {
  it('es determinista y sin adivinar', () => {
    const a = generateLevel(7)
    expect(generateLevel(7).board).toEqual(a.board)
    expect(a.guaranteed).toBe(true)
    const { firstClick } = getLevelConfig(7)
    expect(a.board.cells[firstClick].mineWeight).toBe(0)
  })
})
