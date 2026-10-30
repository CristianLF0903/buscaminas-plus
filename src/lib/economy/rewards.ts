export type GameMode = 'classic' | 'daily' | 'timeAttack' | 'endless' | 'puzzle'

/**
 * Valores de balance en un solo lugar. Los de modos aún no implementados son
 * provisionales y se ajustan en su tarea.
 */
export const REWARDS = {
  /** Base por victoria según modo y dificultad. */
  base: {
    classic: { easy: 10, medium: 25, hard: 60, custom: 10 },
    daily: { default: 50 },
    puzzle: { default: 15 },
  },
  /** Modos por tableros: monedas por cada tablero resuelto. */
  perBoard: {
    timeAttack: { default: 5 },
    endless: { easy: 5, medium: 12, hard: 30 },
  },
  /** Infinito: el tablero `k` paga base × (1 + 0.1 × k), hasta ×2. */
  endlessGrowth: { step: 0.1, cap: 2 },
  perStar: 5,
  /** Reto diario: +5 por día de racha, hasta 10 días. */
  dailyStreak: { perDay: 5, cap: 10 },
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
  /** Racha del reto diario, contando este día. */
  streak?: number
}

export interface RewardBreakdown {
  base: number
  noPowerUpBonus: number
  recordBonus: number
  total: number
}

const lookup = (table: Record<string, number>, difficulty: string) =>
  table[difficulty] ?? table.default ?? 0

/** Multiplicador del tablero `k` (desde 1) en infinito. */
export function endlessMultiplier(k: number): number {
  const { step, cap } = REWARDS.endlessGrowth
  // Redondeo a décimas: 1 + 0.1 × 3 no da 1.3 exacto en coma flotante
  return Math.min(Math.round((1 + step * k) * 10) / 10, cap)
}

/** Monedas por `n` tableros: cada uno según su multiplicador. */
function boardsReward(mode: 'timeAttack' | 'endless', n: number, d: string) {
  const perBoard = lookup(REWARDS.perBoard[mode], d)
  if (mode === 'timeAttack') return n * perBoard
  let total = 0
  for (let k = 1; k <= n; k++) total += perBoard * endlessMultiplier(k)
  return Math.round(total)
}

/** Monedas por partida: base, bonus sin power-ups y bonus por récord. */
export function calculateReward(input: RewardInput): RewardBreakdown {
  const {
    mode,
    difficulty,
    won,
    usedPowerUps,
    isRecord,
    stars,
    boards,
    streak,
  } = input

  let base: number
  let succeeded: boolean
  if (mode === 'timeAttack' || mode === 'endless') {
    // La partida siempre "termina perdiendo": se paga por tablero
    const n = boards ?? 0
    succeeded = n > 0
    base = succeeded ? boardsReward(mode, n, difficulty) : REWARDS.loss
  } else {
    succeeded = won
    base = won
      ? lookup(REWARDS.base[mode], difficulty) + (stars ?? 0) * REWARDS.perStar
      : REWARDS.loss
    if (won && mode === 'daily') {
      const { perDay, cap } = REWARDS.dailyStreak
      base += perDay * Math.min(streak ?? 0, cap)
    }
  }

  // El diario no admite power-ups: no hay bonus por no usarlos
  const noPowerUpBonus =
    succeeded && usedPowerUps === 0 && mode !== 'daily'
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
