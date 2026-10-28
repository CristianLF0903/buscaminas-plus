import { describe, expect, it } from 'vitest'
import { calculateReward, REWARDS } from '@/lib/economy/rewards'
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
    expect(r).toEqual({ base: 2, noPowerUpBonus: 0, recordBonus: 0, total: 2 })
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
    expect(endless.total).toBe(3 * REWARDS.perBoard.endless.medium)

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

  it('puzzle suma por estrellas', () => {
    const r = calculateReward({
      mode: 'puzzle',
      difficulty: 'default',
      won: true,
      usedPowerUps: 1,
      isRecord: false,
      stars: 3,
    })
    expect(r.total).toBe(REWARDS.base.puzzle.default + 3 * REWARDS.perStar)
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
