import { generateNoGuess } from '@/lib/engine/generate'
import type { NoGuessResult } from '@/lib/engine/generate'
import { createRng, hashString } from '@/lib/engine/rng'
import type { BoardConfig } from '@/lib/engine/types'
import { seededFirstClick } from '@/lib/modes/boardQueue'
import { applyVariations, VARIATIONS } from './variations'
import type { VariationId } from './variations'

/** Mecánica que se desbloquea por nivel. `shapes` agrupa las 4 formas. */
export type Mechanic =
  'solids' | 'shapes' | 'hints' | 'doubleMines' | 'fog' | 'wrap' | 'flagLimit'

/** Nivel en el que aparece cada mecánica (su nivel de introducción). */
export const UNLOCKS: Record<Mechanic, number> = {
  solids: 5,
  shapes: 10,
  hints: 15,
  doubleMines: 20,
  fog: 25,
  wrap: 30,
  flagLimit: 35,
}

export const MECHANIC_NAMES: Record<Mechanic, string> = {
  solids: VARIATIONS.solids.name,
  shapes: 'Formas',
  hints: VARIATIONS.hints.name,
  doubleMines: VARIATIONS.doubleMines.name,
  fog: VARIATIONS.fog.name,
  wrap: VARIATIONS.wrap.name,
  flagLimit: VARIATIONS.flagLimit.name,
}

const SHAPES: VariationId[] = ['cross', 'ring', 'diamond', 'holes']

/**
 * Densidad que se resta por mecánica: la niebla y las minas dobles quitan
 * información, y con la misma densidad el tablero dejaría de ser lógico.
 */
const DENSITY_PENALTY: Partial<Record<Mechanic, number>> = {
  fog: 0.04,
  doubleMines: 0.02,
}

/** Curva de tamaño y densidad, con topes. */
export const CURVE = {
  minWidth: 6,
  minHeight: 6,
  maxWidth: 24,
  maxHeight: 20,
  minDensity: 0.12,
  /**
   * Tope real: por encima de ~20% en 24×20 la generación sin adivinar con
   * primer clic fijo falla a menudo (el difícil clásico es 20.6%).
   */
  maxDensity: 0.2,
  /** Nivel en el que la densidad llega al tope. */
  densityCapLevel: 80,
  /** Mecánicas mínimas en un nivel jefe. */
  bossMechanics: 3,
  /** Los jefes usan el tamaño de este número de niveles más adelante. */
  bossSizeAhead: 12,
} as const

const MECHANICS = Object.keys(UNLOCKS) as Mechanic[]

/** Mecánica que el nivel `n` presenta por primera vez, si alguna. */
export const introducedAt = (n: number): Mechanic | null =>
  MECHANICS.find((m) => UNLOCKS[m] === n) ?? null

/** Múltiplo de 10 que no presenta una mecánica: la presentación va primero. */
export const isBoss = (n: number) => n % 10 === 0 && introducedAt(n) === null

const unlockedAt = (n: number) => MECHANICS.filter((m) => UNLOCKS[m] <= n)

function sizeAt(n: number) {
  const { minWidth, minHeight, maxWidth, maxHeight } = CURVE
  return {
    width: Math.min(maxWidth, minWidth + Math.floor((n - 1) / 3)),
    height: Math.min(maxHeight, minHeight + Math.floor((n - 1) / 4)),
  }
}

function densityAt(n: number) {
  const { minDensity, maxDensity, densityCapLevel } = CURVE
  const t = Math.min(1, (n - 1) / (densityCapLevel - 1))
  return minDensity + (maxDensity - minDensity) * t
}

/** Mecánicas del nivel: la nueva sola, 3+ en jefes o 1–2 al azar. */
function mechanicsAt(n: number, rng: ReturnType<typeof createRng>) {
  const intro = introducedAt(n)
  if (intro) return [intro]
  const unlocked = unlockedAt(n)
  if (!unlocked.length) return []
  const count = isBoss(n)
    ? Math.min(unlocked.length, CURVE.bossMechanics + rng.int(0, 1))
    : rng.int(1, Math.min(2, unlocked.length))
  // Orden de desbloqueo: mismo resultado sin importar el barajado
  const picked = new Set(rng.shuffle(unlocked).slice(0, count))
  return unlocked.filter((m) => picked.has(m))
}

/**
 * Segundos para la estrella de tiempo: crece con las celdas y con la
 * densidad (más minas, más deducción). Redondeado a 5 s.
 */
function targetSeconds(config: BoardConfig) {
  const cells =
    config.width * config.height -
    (config.mask?.filter((v) => !v).length ?? 0) -
    (config.solids?.length ?? 0)
  const density = config.mines / cells
  return Math.round((cells * (0.5 + 4 * density) + 15) / 5) * 5
}

export interface LevelConfig {
  level: number
  seed: number
  config: BoardConfig
  /** Primer clic fijo: el tablero se genera antes de jugar. */
  firstClick: number
  mechanics: Mechanic[]
  variations: VariationId[]
  boss: boolean
  targetMs: number
}

const cache = new Map<number, LevelConfig>()

/** Config determinista del nivel `n` (desde 1). Cacheada en memoria. */
export function getLevelConfig(n: number): LevelConfig {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Nivel inválido: ${n}`)
  }
  const hit = cache.get(n)
  if (hit) return hit

  const seed = hashString(`puzzle-${n}`)
  const rng = createRng(seed)
  const boss = isBoss(n)
  const { width, height } = sizeAt(boss ? n + CURVE.bossSizeAhead : n)
  const mechanics = mechanicsAt(n, rng)
  const penalty = mechanics.reduce((s, m) => s + (DENSITY_PENALTY[m] ?? 0), 0)
  const density = Math.max(CURVE.minDensity, densityAt(n) - penalty)
  const mines = Math.max(1, Math.round(width * height * density))

  const variations = mechanics.map((m) =>
    m === 'shapes' ? SHAPES[rng.int(0, SHAPES.length - 1)] : m,
  )
  const config = applyVariations(
    { width, height, mines, noGuess: true },
    variations,
    seed,
  )

  const level: LevelConfig = {
    level: n,
    seed,
    config,
    firstClick: seededFirstClick(config, seed),
    mechanics,
    variations,
    boss,
    targetMs: targetSeconds(config) * 1000,
  }
  cache.set(n, level)
  return level
}

export interface LevelMeta {
  level: number
  /** Nombres de las mecánicas del nivel, para la UI. */
  mechanics: string[]
  boss: boolean
  /** Mecánica nueva (mostrar tutorial corto), o null. */
  introduces: Mechanic | null
  targetMs: number
}

export function getLevelMeta(n: number): LevelMeta {
  const { mechanics, boss, targetMs } = getLevelConfig(n)
  return {
    level: n,
    mechanics: mechanics.map((m) => MECHANIC_NAMES[m]),
    boss,
    introduces: introducedAt(n),
    targetMs,
  }
}

/** Reintentos con menos minas si un nivel no da tablero sin adivinar. */
const FALLBACK_STEPS = 3
const FALLBACK_FACTOR = 0.92

export interface LevelBoard extends NoGuessResult {
  /** Config con la que salió el tablero (puede tener menos minas). */
  config: BoardConfig
}

/**
 * Tablero del nivel `n`, determinista. Si con la config del nivel no hay
 * tablero sin adivinar, baja las minas un 8% y reintenta (hasta 3 veces).
 */
export function generateLevel(n: number): LevelBoard {
  const { config, seed, firstClick } = getLevelConfig(n)
  let current = config
  let result = generateNoGuess(current, seed, firstClick)
  for (let i = 0; i < FALLBACK_STEPS && !result.guaranteed; i++) {
    const mines = Math.max(1, Math.round(current.mines * FALLBACK_FACTOR))
    current = {
      ...current,
      mines,
      ...(current.doubleMines !== undefined && {
        doubleMines: Math.min(current.doubleMines, mines),
      }),
    }
    result = generateNoGuess(current, seed, firstClick)
  }
  return { ...result, config: current }
}
