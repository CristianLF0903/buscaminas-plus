export type GameMode = 'classic' | 'daily' | 'timeAttack' | 'endless' | 'puzzle'

/**
 * Valores de balance en un solo lugar. Los de modos aún no implementados son
 * provisionales y se ajustan en su tarea.
 */
export const REWARDS = {
  /** Base por victoria según modo y dificultad. */
  base: {
    classic: { easy: 10, medium: 25, hard: 60, custom: 10 },
    daily: { default: 30 },
    puzzle: { default: 15 },
  },
  /** Modos por tableros: monedas por cada tablero resuelto. */
  perBoard: {
    timeAttack: { default: 5 },
    endless: { easy: 5, medium: 12, hard: 30 },
  },
  perStar: 5,
  loss: 2,
  /** Multiplicador extra por ganar sin power-ups (0.2 = +20%). */
  noPowerUpBonus: 0.2,
  record: 15,
} as const

export interface RewardInput {
  mode: GameMode
  difficulty: string
  won: boolean
  usedPowerUps: number
  isRecord: boolean
  stars?: number
  /** Tableros resueltos en contrarreloj / infinito. */
  boards?: number
}

export interface RewardBreakdown {
  base: number
  noPowerUpBonus: number
  recordBonus: number
  total: number
}

const lookup = (table: Record<string, number>, difficulty: string) =>
  table[difficulty] ?? table.default ?? 0

/** Monedas por partida: base, bonus sin power-ups y bonus por récord. */
export function calculateReward(input: RewardInput): RewardBreakdown {
  const { mode, difficulty, won, usedPowerUps, isRecord, stars, boards } = input

  let base: number
  let succeeded: boolean
  if (mode === 'timeAttack' || mode === 'endless') {
    // La partida siempre "termina perdiendo": se paga por tablero
    const n = boards ?? 0
    succeeded = n > 0
    base = succeeded
      ? n * lookup(REWARDS.perBoard[mode], difficulty)
      : REWARDS.loss
  } else {
    succeeded = won
    base = won
      ? lookup(REWARDS.base[mode], difficulty) + (stars ?? 0) * REWARDS.perStar
      : REWARDS.loss
  }

  const noPowerUpBonus =
    succeeded && usedPowerUps === 0
      ? Math.round(base * REWARDS.noPowerUpBonus)
      : 0
  const recordBonus = isRecord ? REWARDS.record : 0
  return {
    base,
    noPowerUpBonus,
    recordBonus,
    total: base + noPowerUpBonus + recordBonus,
  }
}
