import { index } from '@/lib/engine/graph'
import { createRng, hashString } from '@/lib/engine/rng'
import type { BoardConfig } from '@/lib/engine/types'

/** Igual para todos: medio, sin adivinar. */
export const DAILY_CONFIG: BoardConfig = {
  width: 16,
  height: 16,
  mines: 40,
  noGuess: true,
}

/** Fecha del reto #1. */
export const DAILY_EPOCH = '2026-10-28'

const DAY_MS = 86_400_000

/** `YYYY-MM-DD` en UTC: el reto cambia a la misma hora en todo el mundo. */
export function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

const dayIndex = (date: string) => Math.round(Date.parse(date) / DAY_MS)

/** Número de reto: #1 en `DAILY_EPOCH`. */
export const dailyNumber = (date: string) =>
  dayIndex(date) - dayIndex(DAILY_EPOCH) + 1

export const dailySeed = (date: string) => hashString(`daily-${date}`)

/**
 * Primer clic fijo, derivado de la semilla: así todos generan el mismo
 * tablero. Se elige lejos de los bordes para que abra un área útil.
 */
export function dailyFirstClick(date: string): number {
  const { width, height } = DAILY_CONFIG
  const rng = createRng(`${dailySeed(date)}:first`)
  const margin = 3
  const x = rng.int(margin, width - 1 - margin)
  const y = rng.int(margin, height - 1 - margin)
  return index(x, y, width)
}

/** Milisegundos hasta el próximo reto (medianoche UTC). */
export function msUntilNextDaily(now: Date = new Date()): number {
  const next = (dayIndex(todayUTC(now)) + 1) * DAY_MS
  return Math.max(0, next - now.getTime())
}

export const previousDay = (date: string) =>
  new Date(Date.parse(date) - DAY_MS).toISOString().slice(0, 10)

export interface DailyEntry {
  /** false mientras se juega; un intento empezado y no terminado es derrota. */
  finished: boolean
  won?: boolean
  timeMs?: number
  /** Racha al terminar este día. */
  streak?: number
  /** Grilla de progreso para compartir. */
  grid?: string
}

/** Días consecutivos ganados que terminan en `date` (incluido). */
export function streakAt(
  daily: Record<string, DailyEntry>,
  date: string,
): number {
  let streak = 0
  for (let d = date; daily[d]?.won; d = previousDay(d)) streak++
  return streak
}
