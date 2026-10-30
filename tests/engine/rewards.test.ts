import { describe, expect, it } from 'vitest'
import {
  calculateReward,
  endlessMultiplier,
  REWARDS,
} from '@/lib/economy/rewards'
import type { RewardInput } from '@/lib/economy/rewards'

const classic = (over: Partial<RewardInput> = {}): RewardInput => ({
  mode: 'classic',
  difficulty: 'easy',
  won: true,
  usedPowerUps: 1,
  isRecord: false,
  ...over,
})

describe('calculateReward', () => {
  it('base por dificultad en clásico', () => {
    expect(calculateReward(classic({ difficulty: 'easy' })).total).toBe(10)
    expect(calculateReward(classic({ difficulty: 'medium' })).total).toBe(25)
    expect(calculateReward(classic({ difficulty: 'hard' })).total).toBe(60)
    expect(calculateReward(classic({ difficulty: 'custom' })).total).toBe(10)
  })

  it('derrota da el mínimo, sin bonus de power-ups', () => {
    const r = calculateReward(
      classic({ difficulty: 'hard', won: false, usedPowerUps: 0 }),
    )
    expect(r).toEqual({
      base: 2,
      noPowerUpBonus: 0,
      recordBonus: 0,
      starBonus: 0,
      total: 2,
    })
  })

  it('+20% sin power-ups', () => {
    const r = calculateReward(
      classic({ difficulty: 'medium', usedPowerUps: 0 }),
    )
    expect(r.noPowerUpBonus).toBe(5)
    expect(r.total).toBe(30)
    expect(
      calculateReward(classic({ difficulty: 'hard', usedPowerUps: 0 })).total,
    ).toBe(72)
  })

  it('+15 por récord', () => {
    const r = calculateReward(classic({ isRecord: true }))
    expect(r.recordBonus).toBe(15)
    expect(r.total).toBe(25)
  })

  it('combina todos los bonus', () => {
    const r = calculateReward(
      classic({ difficulty: 'easy', usedPowerUps: 0, isRecord: true }),
    )
    expect(r).toEqual({
      base: 10,
      noPowerUpBonus: 2,
      recordBonus: 15,
      starBonus: 0,
      total: 27,
    })
  })

  it('modos por tableros pagan por tablero', () => {
    const endless = calculateReward({
      mode: 'endless',
      difficulty: 'medium',
      won: false,
      usedPowerUps: 1,
      isRecord: false,
      boards: 3,
    })
    // 12 × (1.1 + 1.2 + 1.3) = 43.2
    expect(endless.total).toBe(43)

    const timeAttack = calculateReward({
      mode: 'timeAttack',
      difficulty: 'default',
      won: false,
      usedPowerUps: 0,
      isRecord: false,
      boards: 4,
    })
    expect(timeAttack.base).toBe(20)
    expect(timeAttack.noPowerUpBonus).toBe(4)
  })

  it('infinito: multiplicador crece 0.1 por tablero hasta ×2', () => {
    expect(endlessMultiplier(1)).toBe(1.1)
    expect(endlessMultiplier(3)).toBe(1.3)
    expect(endlessMultiplier(10)).toBe(2)
    expect(endlessMultiplier(50)).toBe(REWARDS.endlessGrowth.cap)
  })

  it('infinito: los tableros pasado el tope pagan ×2', () => {
    const reward = (boards: number) =>
      calculateReward({
        mode: 'endless',
        difficulty: 'easy',
        won: false,
        usedPowerUps: 1,
        isRecord: false,
        boards,
      }).base
    // 5 × (1.1 + … + 2.0) = 77.5
    expect(reward(10)).toBe(78)
    expect(reward(11) - reward(10)).toBe(10)
  })

  it('cero tableros da el mínimo', () => {
    const r = calculateReward({
      mode: 'endless',
      difficulty: 'hard',
      won: false,
      usedPowerUps: 0,
      isRecord: false,
      boards: 0,
    })
    expect(r.total).toBe(REWARDS.loss)
  })

  it('puzzle: 10 + 2 × nivel + 10 por estrella nueva, sin otros bonus', () => {
    const puzzle = (over: Partial<RewardInput>) =>
      calculateReward({
        mode: 'puzzle',
        difficulty: 'default',
        won: true,
        usedPowerUps: 0,
        isRecord: true,
        level: 7,
        ...over,
      })
    expect(puzzle({ newStars: 3 })).toEqual({
      base: 24,
      noPowerUpBonus: 0,
      recordBonus: 0,
      starBonus: 30,
      total: 54,
    })
    // Repetir un nivel ya con todas sus estrellas paga solo la base
    expect(puzzle({ newStars: 0 }).total).toBe(24)
    expect(puzzle({ won: false, newStars: 2 }).total).toBe(REWARDS.loss)
  })

  it('reto diario usa su base', () => {
    const r = calculateReward({
      mode: 'daily',
      difficulty: 'default',
      won: true,
      usedPowerUps: 0,
      isRecord: false,
    })
    expect(r.total).toBe(50)
  })
})
