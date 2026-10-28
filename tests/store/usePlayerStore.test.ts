import { beforeEach, describe, expect, it } from 'vitest'
import { recordKey, resetPlayer, usePlayerStore } from '@/store/usePlayerStore'
import type { GameResult } from '@/store/usePlayerStore'

const state = () => usePlayerStore.getState()

const win = (over: Partial<GameResult> = {}): GameResult => ({
  mode: 'classic',
  difficulty: 'easy',
  won: true,
  timeMs: 60_000,
  usedPowerUps: 0,
  ...over,
})

describe('usePlayerStore', () => {
  beforeEach(() => {
    resetPlayer()
    localStorage.clear()
  })

  it('monedas: sumar y gastar, sin saldo negativo', () => {
    state().addCoins(50)
    expect(state().spendCoins(30)).toBe(true)
    expect(state().coins).toBe(20)
    expect(state().spendCoins(21)).toBe(false)
    expect(state().coins).toBe(20)
  })

  it('inventario: agregar y consumir', () => {
    expect(state().inventory.radar).toBe(0)
    expect(state().consumePowerUp('radar')).toBe(false)
    state().addPowerUp('radar', 2)
    expect(state().consumePowerUp('radar')).toBe(true)
    expect(state().inventory.radar).toBe(1)
  })

  it('buyPowerUp cobra y suma al inventario', () => {
    state().addCoins(100)
    expect(state().buyPowerUp('radar')).toBe(true)
    expect(state().coins).toBe(60)
    expect(state().inventory.radar).toBe(1)
  })

  it('buyPowerUp falla sin monedas suficientes y no cambia nada', () => {
    state().addCoins(79)
    expect(state().buyPowerUp('shield')).toBe(false)
    expect(state().coins).toBe(79)
    expect(state().inventory.shield).toBe(0)
  })

  it('la compra persiste', () => {
    state().addCoins(20)
    state().buyPowerUp('hint')
    const saved = JSON.parse(localStorage.getItem('buscaminas-player')!)
    expect(saved.state.coins).toBe(0)
    expect(saved.state.inventory.hint).toBe(1)
  })

  it('submitResult registra mejor tiempo y avisa récord', () => {
    expect(state().submitResult(win({ timeMs: 60_000 })).isRecord).toBe(true)
    expect(state().submitResult(win({ timeMs: 70_000 })).isRecord).toBe(false)
    expect(state().submitResult(win({ timeMs: 50_000 })).isRecord).toBe(true)
    expect(state().records[recordKey('classic', 'easy')].bestTimeMs).toBe(
      50_000,
    )
  })

  it('una derrota no es récord de tiempo', () => {
    expect(state().submitResult(win({ won: false })).isRecord).toBe(false)
    expect(state().records['classic:easy'].bestTimeMs).toBeUndefined()
  })

  it('personalizado no registra récords', () => {
    expect(state().submitResult(win({ difficulty: 'custom' })).isRecord).toBe(
      false,
    )
  })

  it('récords de tableros, nivel y estrellas', () => {
    const endless = { mode: 'endless', difficulty: 'hard', won: false } as const
    expect(state().submitResult(win({ ...endless, boards: 3 })).isRecord).toBe(
      true,
    )
    expect(state().submitResult(win({ ...endless, boards: 2 })).isRecord).toBe(
      false,
    )
    const puzzle = { mode: 'puzzle', difficulty: 'default' } as const
    expect(
      state().submitResult(win({ ...puzzle, level: 1, stars: 2 })).isRecord,
    ).toBe(true)
    state().submitResult(win({ ...puzzle, level: 1, stars: 1, timeMs: 1e9 }))
    const rec = state().records['puzzle:default']
    expect(rec.maxLevel).toBe(1)
    expect(rec.stars).toEqual({ 1: 2 })
  })

  it('stats y racha de victorias', () => {
    state().submitResult(win())
    state().submitResult(win())
    state().submitResult(win({ won: false }))
    state().submitResult(win({ difficulty: 'hard' }))
    const { stats } = state()
    expect(stats.played).toBe(4)
    expect(stats.won).toBe(3)
    expect(stats.currentWinStreak).toBe(1)
    expect(stats.bestWinStreak).toBe(2)
    expect(stats.byKey['classic:easy']).toEqual({ played: 3, won: 2 })
  })

  it('finishGame paga recompensa con récord', () => {
    const reward = state().finishGame(win({ difficulty: 'medium' }))
    // 25 base + 5 sin power-ups + 15 récord
    expect(reward.total).toBe(45)
    expect(reward.isRecord).toBe(true)
    expect(state().coins).toBe(45)
  })

  it('reto diario: un intento por día', () => {
    expect(state().startDaily('2026-10-28')).toBe(true)
    expect(state().startDaily('2026-10-28')).toBe(false)
    expect(state().daily['2026-10-28']).toEqual({ finished: false })
  })

  it('reto diario: racha y recompensa 50 + 5 × racha', () => {
    const daily = (date: string, won = true) =>
      state().finishGame(
        win({ mode: 'daily', difficulty: 'default', date, won, grid: '🟩' }),
      )
    daily('2026-10-26')
    daily('2026-10-27')
    const third = daily('2026-10-28')
    expect(state().daily['2026-10-28']).toMatchObject({
      finished: true,
      won: true,
      streak: 3,
      timeMs: 60_000,
      grid: '🟩',
    })
    // 50 + 5×3, sin bonus de power-ups (el diario no los admite)
    expect(third.base).toBe(65)
    expect(third.noPowerUpBonus).toBe(0)
    expect(state().records['daily:default'].bestStreak).toBe(3)

    const lost = daily('2026-10-29', false)
    expect(lost.total).toBe(2)
    expect(state().daily['2026-10-29'].streak).toBe(0)
  })

  it('reto diario: la racha tiene tope de 10 días', () => {
    for (let d = 1; d <= 12; d++) {
      state().finishGame(
        win({
          mode: 'daily',
          difficulty: 'default',
          date: `2026-11-${String(d).padStart(2, '0')}`,
          timeMs: 1e9,
        }),
      )
    }
    expect(state().daily['2026-11-12'].streak).toBe(12)
    const r = state().finishGame(
      win({
        mode: 'daily',
        difficulty: 'default',
        date: '2026-11-13',
        timeMs: 1e9,
      }),
    )
    expect(r.base).toBe(100)
  })

  it('persiste en localStorage y sobrevive a una recarga', async () => {
    state().addCoins(42)
    state().addPowerUp('shield')
    state().submitResult(win())
    const saved = JSON.parse(localStorage.getItem('buscaminas-player')!)
    expect(saved.version).toBe(1)
    expect(saved.state.coins).toBe(42)
    expect(saved.state.addCoins).toBeUndefined()

    // "Recarga": estado en memoria limpio y rehidratación desde storage
    usePlayerStore.setState({ coins: 0 })
    localStorage.setItem('buscaminas-player', JSON.stringify(saved))
    await usePlayerStore.persist.rehydrate()
    expect(state().coins).toBe(42)
    expect(state().inventory.shield).toBe(1)
    expect(state().records['classic:easy'].bestTimeMs).toBe(60_000)
  })

  it('rehidratar datos viejos completa power-ups nuevos', async () => {
    localStorage.setItem(
      'buscaminas-player',
      JSON.stringify({
        state: { coins: 5, inventory: { radar: 2 } },
        version: 1,
      }),
    )
    await usePlayerStore.persist.rehydrate()
    expect(state().inventory.radar).toBe(2)
    expect(state().inventory.hint).toBe(0)
  })
})
