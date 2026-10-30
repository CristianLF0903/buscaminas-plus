import { describe, expect, it } from 'vitest'
import {
  ALL_STARS,
  countStars,
  isUnlocked,
  newStarsOf,
  pageOf,
  parseLevel,
  STAR,
  starsFor,
} from '@/lib/modes/puzzle'
import { generateLevel, generateLevelAsync } from '@/lib/puzzle/levels'

describe('estrellas', () => {
  const run = { won: true, timeMs: 50_000, targetMs: 60_000, usedPowerUps: 0 }

  it('las tres: completar, tiempo y sin power-ups', () => {
    expect(starsFor(run)).toBe(ALL_STARS)
    expect(starsFor({ ...run, timeMs: 61_000 })).toBe(
      STAR.complete | STAR.noPowerUps,
    )
    expect(starsFor({ ...run, usedPowerUps: 1 })).toBe(
      STAR.complete | STAR.time,
    )
    // Justo en el objetivo cuenta
    expect(starsFor({ ...run, timeMs: 60_000 }) & STAR.time).toBeTruthy()
  })

  it('perder no da estrellas', () => {
    expect(starsFor({ ...run, won: false })).toBe(0)
  })

  it('cuenta y detecta las nuevas', () => {
    expect(countStars(0)).toBe(0)
    expect(countStars(ALL_STARS)).toBe(3)
    const prev = STAR.complete | STAR.time
    expect(newStarsOf(prev, ALL_STARS)).toBe(STAR.noPowerUps)
    expect(newStarsOf(ALL_STARS, STAR.complete)).toBe(0)
  })
})

describe('desbloqueo y URL', () => {
  it('se juega hasta el siguiente al último completado', () => {
    expect(isUnlocked(1)).toBe(true)
    expect(isUnlocked(2)).toBe(false)
    expect(isUnlocked(6, 5)).toBe(true)
    expect(isUnlocked(7, 5)).toBe(false)
  })

  it('el nivel de la URL es un entero ≥ 1', () => {
    expect(parseLevel('1')).toBe(1)
    expect(parseLevel('42')).toBe(42)
    for (const bad of [undefined, '', '0', '-3', '1.5', '01', 'abc', '1e3']) {
      expect(parseLevel(bad)).toBeNull()
    }
  })

  it('páginas de 50 niveles', () => {
    expect(pageOf(1)).toBe(0)
    expect(pageOf(50)).toBe(0)
    expect(pageOf(51)).toBe(1)
  })
})

describe('generateLevelAsync', () => {
  it('da el mismo tablero que generateLevel', async () => {
    const sync = generateLevel(12)
    const async = await generateLevelAsync(12)
    expect(async.board).toEqual(sync.board)
    expect(async.config).toEqual(sync.config)
  })
})
