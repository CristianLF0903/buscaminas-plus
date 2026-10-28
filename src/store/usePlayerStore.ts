import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { POWER_UP_PRICES } from '@/lib/economy/prices'
import { calculateReward } from '@/lib/economy/rewards'
import type { GameMode, RewardBreakdown } from '@/lib/economy/rewards'
import { POWER_UP_IDS } from '@/lib/powerups/ids'
import type { PowerUpId } from '@/lib/powerups/ids'

export interface ModeRecord {
  bestTimeMs?: number
  maxBoards?: number
  /** Racha de días (reto diario). */
  bestStreak?: number
  maxLevel?: number
  /** Estrellas por nivel de puzzle. */
  stars?: Record<number, number>
}

export interface PlayerStats {
  played: number
  won: number
  currentWinStreak: number
  bestWinStreak: number
  byKey: Record<string, { played: number; won: number }>
}

export interface GameResult {
  mode: GameMode
  difficulty: string
  won: boolean
  timeMs: number
  usedPowerUps: number
  boards?: number
  level?: number
  stars?: number
  streak?: number
}

export interface PlayerState {
  coins: number
  inventory: Record<PowerUpId, number>
  /** Clave `modo:dificultad`, ver `recordKey`. */
  records: Record<string, ModeRecord>
  stats: PlayerStats

  addCoins: (amount: number) => void
  /** false (sin cambios) si no alcanza. */
  spendCoins: (amount: number) => boolean
  addPowerUp: (id: PowerUpId, amount?: number) => void
  /** false si no hay unidades. */
  consumePowerUp: (id: PowerUpId) => boolean
  /** Cobra el precio y suma al inventario en una sola actualización. */
  buyPowerUp: (id: PowerUpId) => boolean
  /** Actualiza récords y stats. */
  submitResult: (result: GameResult) => { isRecord: boolean }
  /** `submitResult` + recompensa + monedas, en una sola actualización. */
  finishGame: (result: GameResult) => RewardBreakdown & { isRecord: boolean }
}

export const recordKey = (mode: GameMode, difficulty: string) =>
  `${mode}:${difficulty}`

const emptyInventory = () =>
  Object.fromEntries(POWER_UP_IDS.map((id) => [id, 0])) as Record<
    PowerUpId,
    number
  >

const initialData = () => ({
  coins: 0,
  inventory: emptyInventory(),
  records: {} as Record<string, ModeRecord>,
  stats: {
    played: 0,
    won: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    byKey: {},
  } as PlayerStats,
})

/** Récord nuevo y si mejoró. Personalizado no registra récords. */
function updateRecord(
  prev: ModeRecord | undefined,
  r: GameResult,
): { record: ModeRecord; isRecord: boolean } {
  const record: ModeRecord = { ...prev }
  let isRecord = false
  const improve = <K extends 'maxBoards' | 'bestStreak' | 'maxLevel'>(
    key: K,
    value: number | undefined,
  ) => {
    if (value === undefined || value <= 0) return
    if (record[key] === undefined || value > record[key]!) {
      record[key] = value
      isRecord = true
    }
  }

  if (r.difficulty !== 'custom') {
    if (
      r.won &&
      r.mode !== 'timeAttack' &&
      r.mode !== 'endless' &&
      (record.bestTimeMs === undefined || r.timeMs < record.bestTimeMs)
    ) {
      record.bestTimeMs = r.timeMs
      isRecord = true
    }
    improve('maxBoards', r.boards)
    improve('bestStreak', r.streak)
    if (r.won) improve('maxLevel', r.level)
    if (r.won && r.level !== undefined && r.stars !== undefined) {
      const prevStars = record.stars?.[r.level] ?? 0
      if (r.stars > prevStars) {
        record.stars = { ...record.stars, [r.level]: r.stars }
        isRecord = true
      }
    }
  }
  return { record, isRecord }
}

function updateStats(stats: PlayerStats, r: GameResult): PlayerStats {
  const key = recordKey(r.mode, r.difficulty)
  const prev = stats.byKey[key] ?? { played: 0, won: 0 }
  const currentWinStreak = r.won ? stats.currentWinStreak + 1 : 0
  return {
    played: stats.played + 1,
    won: stats.won + (r.won ? 1 : 0),
    currentWinStreak,
    bestWinStreak: Math.max(stats.bestWinStreak, currentWinStreak),
    byKey: {
      ...stats.byKey,
      [key]: { played: prev.played + 1, won: prev.won + (r.won ? 1 : 0) },
    },
  }
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),

      spendCoins: (amount) => {
        if (amount < 0 || get().coins < amount) return false
        set((s) => ({ coins: s.coins - amount }))
        return true
      },

      addPowerUp: (id, amount = 1) =>
        set((s) => ({
          inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + amount },
        })),

      consumePowerUp: (id) => {
        if ((get().inventory[id] ?? 0) <= 0) return false
        set((s) => ({
          inventory: { ...s.inventory, [id]: s.inventory[id] - 1 },
        }))
        return true
      },

      buyPowerUp: (id) => {
        const price = POWER_UP_PRICES[id]
        if (get().coins < price) return false
        set((s) => ({
          coins: s.coins - price,
          inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + 1 },
        }))
        return true
      },

      submitResult: (result) => {
        const key = recordKey(result.mode, result.difficulty)
        const { record, isRecord } = updateRecord(get().records[key], result)
        set((s) => ({
          records: { ...s.records, [key]: record },
          stats: updateStats(s.stats, result),
        }))
        return { isRecord }
      },

      finishGame: (result) => {
        const { isRecord } = get().submitResult(result)
        const reward = calculateReward({ ...result, isRecord })
        get().addCoins(reward.total)
        return { ...reward, isRecord }
      },
    }),
    {
      name: 'buscaminas-player',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ coins, inventory, records, stats }) => ({
        coins,
        inventory,
        records,
        stats,
      }),
      // Punto de entrada para cambios de esquema futuros (version 2, 3...)
      migrate: (persisted) => persisted as PlayerState,
      // Power-ups nuevos en el catálogo arrancan en 0
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlayerState>
        return {
          ...current,
          ...p,
          inventory: { ...emptyInventory(), ...p.inventory },
        }
      },
    },
  ),
)

/** Vuelve al estado inicial (tests y "borrar progreso" en ajustes). */
export const resetPlayer = () => usePlayerStore.setState(initialData())
