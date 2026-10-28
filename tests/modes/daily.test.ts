import { describe, expect, it } from 'vitest'
import { generateNoGuess } from '@/lib/engine/generate'
import { coords } from '@/lib/engine/graph'
import { reveal } from '@/lib/engine/reveal'
import { solve } from '@/lib/engine/solver'
import {
  DAILY_CONFIG,
  dailyFirstClick,
  dailyNumber,
  dailySeed,
  msUntilNextDaily,
  previousDay,
  streakAt,
  todayUTC,
} from '@/lib/modes/daily'
import { progressGrid, shareText } from '@/lib/share/daily'

describe('fecha y número', () => {
  it('usa la fecha UTC', () => {
    // 23:30 en Bogotá (UTC-5) ya es el día siguiente en UTC
    expect(todayUTC(new Date('2026-10-28T04:30:00Z'))).toBe('2026-10-28')
    expect(todayUTC(new Date('2026-10-28T23:59:59Z'))).toBe('2026-10-28')
  })

  it('numera desde el 28 de octubre de 2026', () => {
    expect(dailyNumber('2026-10-28')).toBe(1)
    expect(dailyNumber('2026-11-01')).toBe(5)
    expect(dailyNumber('2027-10-28')).toBe(366)
  })

  it('cuenta regresiva hasta medianoche UTC', () => {
    expect(msUntilNextDaily(new Date('2026-10-28T23:59:00Z'))).toBe(60_000)
  })

  it('día anterior cruza meses y años', () => {
    expect(previousDay('2026-11-01')).toBe('2026-10-31')
    expect(previousDay('2027-01-01')).toBe('2026-12-31')
  })
})

describe('mismo tablero para todos', () => {
  it('semilla y primer clic dependen solo de la fecha', () => {
    expect(dailySeed('2026-10-28')).toBe(dailySeed('2026-10-28'))
    expect(dailySeed('2026-10-28')).not.toBe(dailySeed('2026-10-29'))
    const first = dailyFirstClick('2026-10-28')
    expect(dailyFirstClick('2026-10-28')).toBe(first)
    const { x, y } = coords(first, DAILY_CONFIG.width)
    expect(x).toBeGreaterThanOrEqual(3)
    expect(x).toBeLessThanOrEqual(12)
    expect(y).toBeGreaterThanOrEqual(3)
    expect(y).toBeLessThanOrEqual(12)
  })

  it('dos generaciones del mismo día dan el mismo tablero, resoluble', () => {
    for (const date of ['2026-10-28', '2026-10-29', '2027-02-14']) {
      const first = dailyFirstClick(date)
      const a = generateNoGuess(DAILY_CONFIG, dailySeed(date), first)
      const b = generateNoGuess(DAILY_CONFIG, dailySeed(date), first)
      expect(a).toEqual(b)
      expect(a.guaranteed).toBe(true)
      expect(solve(a.board, first).solved).toBe(true)
    }
  })
})

describe('racha', () => {
  it('cuenta días ganados consecutivos hasta la fecha', () => {
    const daily = {
      '2026-10-26': { finished: true, won: true },
      '2026-10-27': { finished: true, won: true },
      '2026-10-28': { finished: true, won: true },
    }
    expect(streakAt(daily, '2026-10-28')).toBe(3)
    expect(streakAt(daily, '2026-10-29')).toBe(0)
  })

  it('una derrota o un día sin jugar corta la racha', () => {
    const daily = {
      '2026-10-25': { finished: true, won: true },
      '2026-10-27': { finished: true, won: false },
      '2026-10-28': { finished: true, won: true },
    }
    expect(streakAt(daily, '2026-10-28')).toBe(1)
  })
})

describe('compartir', () => {
  it('texto con número, resultado, tiempo y racha', () => {
    expect(
      shareText({ number: 123, won: true, timeMs: 161_000, streak: 5 }),
    ).toBe('Buscaminas+ #123 ✅ 2:41 🔥5')
    expect(shareText({ number: 7, won: false, streak: 0 })).toBe(
      'Buscaminas+ #7 ❌',
    )
  })

  it('agrega la grilla debajo', () => {
    const text = shareText({ number: 1, won: false, streak: 0, grid: '🟩⬛' })
    expect(text).toBe('Buscaminas+ #1 ❌\n🟩⬛')
  })

  it('grilla 5×5 del progreso', () => {
    const date = '2026-10-28'
    const first = dailyFirstClick(date)
    const { board } = generateNoGuess(DAILY_CONFIG, dailySeed(date), first)
    const before = progressGrid(board, null)
    expect(before.split('\n')).toHaveLength(5)
    expect([...before.replace(/\n/g, '')].length).toBe(25)
    expect(before).not.toMatch(/🟩|🟨/)

    const opened = reveal(board, first).board
    expect(progressGrid(opened, null)).toMatch(/🟨|🟩/)

    const mine = board.cells.find((c) => c.mineWeight > 0)!
    expect(progressGrid(opened, mine.id)).toContain('💥')
  })
})
