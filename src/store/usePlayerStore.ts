import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { POWER_UP_PRICES } from '@/lib/economy/prices'
import { calculateReward } from '@/lib/economy/rewards'
import { STARTER_GIFT } from '@/lib/economy/starterGift'
import { streakAt } from '@/lib/modes/daily'
import type { DailyEntry } from '@/lib/modes/daily'
import type { GameMode, RewardBreakdown } from '@/lib/economy/rewards'
import { POWER_UP_IDS } from '@/lib/powerups/ids'
import type { PowerUpId } from '@/lib/powerups/ids'

export interface ModeRecord {
  bestTimeMs?: number
  maxBoards?: number
  /** Infinito: mejor racha sin usar power-ups (dato extra, no da bonus). */
  maxBoardsNoPowerUps?: number
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
  /** Reto diario: fecha UTC del reto y grilla para compartir. */
  date?: string
  grid?: string
}

export interface PlayerState {
  coins: number
  inventory: Record<PowerUpId, number>
  /** Clave `modo:dificultad`, ver `recordKey`. */
  records: Record<string, ModeRecord>
  stats: PlayerStats
  /** Reto diario por fecha UTC: un intento por día. */
  daily: Record<string, DailyEntry>
  /** Regalo de bienvenida ya reclamado. */
  starterGiftClaimed: boolean

  addCoins: (amount: number) => void
  /** false (sin cambios) si no alcanza. */
  spendCoins: (amount: number) => boolean
  addPowerUp: (id: PowerUpId, amount?: number) => void
  /** false si no hay unidades. */
  consumePowerUp: (id: PowerUpId) => boolean
  /** Cobra el precio y suma al inventario en una sola actualización. */
  buyPowerUp: (id: PowerUpId) => boolean
  /** Registra el intento del día. false si ya se jugó (o empezó). */
  startDaily: (date: string) => boolean
  /** Actualiza récords y stats. */
  submitResult: (result: GameResult) => { isRecord: boolean }
  /** `submitResult` + recompensa + monedas, en una sola actualización. */
  finishGame: (result: GameResult) => RewardBreakdown & { isRecord: boolean }
  /** Da el regalo de bienvenida una sola vez. false si ya se reclamó. */
  claimStarterGift: () => boolean
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
  daily: {} as Record<string, DailyEntry>,
  starterGiftClaimed: false,
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
    const clean = r.mode === 'endless' && r.usedPowerUps === 0
    if (clean && r.boards && r.boards > (record.maxBoardsNoPowerUps ?? 0)) {
      record.maxBoardsNoPowerUps = r.boards
    }
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

      startDaily: (date) => {
        if (get().daily[date]) return false
        set((s) => ({ daily: { ...s.daily, [date]: { finished: false } } }))
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

      finishGame: (input) => {
        let result = input
        if (input.mode === 'daily' && input.date) {
          // La racha cuenta este día: primero se guarda la entrada
          const { date, won, timeMs, grid } = input
          const entry: DailyEntry = { finished: true, won, grid }
          if (won) entry.timeMs = timeMs
          const daily = { ...get().daily, [date]: entry }
          entry.streak = won ? streakAt(daily, date) : 0
          set({ daily })
          result = { ...input, streak: entry.streak }
        }
        const { isRecord } = get().submitResult(result)
        const reward = calculateReward({ ...result, isRecord })
        get().addCoins(reward.total)
        return { ...reward, isRecord }
      },

      claimStarterGift: () => {
        if (get().starterGiftClaimed) return false
        set((s) => {
          const inventory = { ...s.inventory }
          for (const [id, n] of Object.entries(STARTER_GIFT.powerUps)) {
            inventory[id as PowerUpId] += n
          }
          return {
            coins: s.coins + STARTER_GIFT.coins,
            inventory,
            starterGiftClaimed: true,
          }
        })
        return true
      },
    }),
    {
      name: 'buscaminas-player',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: ({
        coins,
        inventory,
        records,
        stats,
        daily,
        starterGiftClaimed,
      }) => ({
        coins,
        inventory,
        records,
        stats,
        daily,
        starterGiftClaimed,
      }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<PlayerState>
        // v2: regalo de bienvenida, también para jugadores existentes
        if (version < 2)
          return { ...p, starterGiftClaimed: false } as PlayerState
        return p as PlayerState
      },
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
