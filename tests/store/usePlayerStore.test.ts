import { beforeEach, describe, expect, it } from 'vitest'
import { THEMES } from '@/lib/themes'
import {
  ownsTheme,
  recordKey,
  resetPlayer,
  usePlayerStore,
} from '@/store/usePlayerStore'
import type { GameResult } from '@/store/usePlayerStore'
import { STARTER_GIFT } from '@/lib/economy/starterGift'
import { ALL_STARS, STAR } from '@/lib/modes/puzzle'

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
    const done = STAR.complete
    expect(
      state().submitResult(
        win({ ...puzzle, level: 1, stars: done | STAR.time }),
      ).isRecord,
    ).toBe(true)
    state().submitResult(win({ ...puzzle, level: 1, stars: done, timeMs: 1e9 }))
    const rec = state().records['puzzle:default']
    expect(rec.maxLevel).toBe(1)
    // Las estrellas se acumulan (máscara); el puzzle no guarda mejor tiempo
    expect(rec.stars).toEqual({ 1: done | STAR.time })
    expect(rec.bestTimeMs).toBeUndefined()
  })

  it('puzzle: cada estrella se paga solo la primera vez', () => {
    const level = (stars: number, over: Partial<GameResult> = {}) =>
      state().finishGame(
        win({
          mode: 'puzzle',
          difficulty: 'default',
          level: 3,
          stars,
          ...over,
        }),
      )
    // Completar + tiempo: 10 + 2×3 + 2×10
    expect(level(STAR.complete | STAR.time).total).toBe(36)
    // Repite con sin power-ups: solo esa es nueva
    expect(level(STAR.complete | STAR.noPowerUps).total).toBe(26)
    // Ya tiene las tres: solo la base
    expect(level(ALL_STARS).total).toBe(16)
    expect(state().records['puzzle:default'].stars).toEqual({ 3: ALL_STARS })
    // Perder no toca las estrellas
    expect(level(0, { won: false }).total).toBe(2)
    expect(state().records['puzzle:default'].maxLevel).toBe(3)
  })

  it('infinito guarda aparte la mejor racha sin power-ups', () => {
    const endless = { mode: 'endless', difficulty: 'easy', won: false } as const
    state().submitResult(win({ ...endless, boards: 5, usedPowerUps: 2 }))
    state().submitResult(win({ ...endless, boards: 3 }))
    let rec = state().records[recordKey('endless', 'easy')]
    expect(rec.maxBoards).toBe(5)
    expect(rec.maxBoardsNoPowerUps).toBe(3)

    // Mejora solo la racha limpia: dato extra, no cuenta como récord
    expect(state().submitResult(win({ ...endless, boards: 4 })).isRecord).toBe(
      false,
    )
    rec = state().records[recordKey('endless', 'easy')]
    expect(rec.maxBoards).toBe(5)
    expect(rec.maxBoardsNoPowerUps).toBe(4)
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
    expect(stats.byKey['classic:easy']).toMatchObject({ played: 3, won: 2 })
  })

  it('stats por modo: racha, tiempo de victorias, monedas y power-ups', () => {
    state().finishGame(win({ timeMs: 30_000, usedPowerUps: 1 }))
    state().finishGame(win({ timeMs: 50_000 }))
    state().finishGame(win({ won: false, usedPowerUps: 2 }))
    state().finishGame(win({ timeMs: 40_000 }))
    const { stats, coins } = state()
    expect(stats.byKey['classic:easy']).toEqual({
      played: 4,
      won: 3,
      streak: 1,
      bestStreak: 2,
      winTimeMs: 120_000,
    })
    expect(stats.powerUpsUsed).toBe(3)
    expect(stats.coinsEarned).toBe(coins)
  })

  it('temas: los gratis son tuyos, los de pago se compran una vez', () => {
    expect(ownsTheme(state(), 'minimal')).toBe(true)
    expect(ownsTheme(state(), 'retro')).toBe(false)
    expect(state().buyTheme('retro')).toBe(false) // sin monedas
    state().addCoins(THEMES.retro.price + 10)
    expect(state().buyTheme('retro')).toBe(true)
    expect(state().coins).toBe(10)
    expect(ownsTheme(state(), 'retro')).toBe(true)
    expect(state().buyTheme('retro')).toBe(false) // ya es tuyo
    expect(state().buyTheme('classic')).toBe(false) // gratis
    expect(state().coins).toBe(10)
  })

  it('resetStats borra solo las estadísticas', () => {
    state().finishGame(win())
    const { coins, records } = state()
    state().resetStats()
    expect(state().stats.played).toBe(0)
    expect(state().stats.byKey).toEqual({})
    expect(state().coins).toBe(coins)
    expect(state().records).toEqual(records)
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
    expect(saved.version).toBe(2)
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

  it('regalo de bienvenida: una sola vez', () => {
    expect(state().starterGiftClaimed).toBe(false)
    expect(state().claimStarterGift()).toBe(true)
    expect(state().coins).toBe(STARTER_GIFT.coins)
    expect(state().inventory.hint).toBe(1)
    expect(state().inventory.radar).toBe(1)
    expect(state().starterGiftClaimed).toBe(true)

    expect(state().claimStarterGift()).toBe(false)
    expect(state().coins).toBe(STARTER_GIFT.coins)
    expect(state().inventory.hint).toBe(1)
  })

  it('migración v1 → v2: los jugadores existentes reciben el regalo', async () => {
    localStorage.setItem(
      'buscaminas-player',
      JSON.stringify({
        state: { coins: 100, inventory: { hint: 2 }, starterGiftClaimed: true },
        version: 1,
      }),
    )
    await usePlayerStore.persist.rehydrate()
    expect(state().coins).toBe(100)
    expect(state().starterGiftClaimed).toBe(false)
    state().claimStarterGift()
    expect(state().inventory.hint).toBe(3)

    // En v2 el flag se respeta
    localStorage.setItem(
      'buscaminas-player',
      JSON.stringify({ state: { starterGiftClaimed: true }, version: 2 }),
    )
    await usePlayerStore.persist.rehydrate()
    expect(state().starterGiftClaimed).toBe(true)
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
