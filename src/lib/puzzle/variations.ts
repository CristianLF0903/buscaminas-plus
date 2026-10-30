import { buildNeighbors, coords } from '@/lib/engine/graph'
import { createRng } from '@/lib/engine/rng'
import type { Rng } from '@/lib/engine/rng'
import type { BoardConfig } from '@/lib/engine/types'

// ── Formas ────────────────────────────────────────────────────────────────
// Máscaras de `width × height`: `true` = la celda es parte del tablero.

/** Rectángulo completo (sin cambios). */
export function shapeRect(width: number, height: number): boolean[] {
  return Array.from({ length: width * height }, () => true)
}

/** Cruz: dos franjas centrales de un tercio del lado. */
export function shapeCross(width: number, height: number): boolean[] {
  const armW = Math.max(3, Math.round(width / 3))
  const armH = Math.max(3, Math.round(height / 3))
  const x0 = Math.floor((width - armW) / 2)
  const y0 = Math.floor((height - armH) / 2)
  return shapeRect(width, height).map((_, id) => {
    const { x, y } = coords(id, width)
    return (x >= x0 && x < x0 + armW) || (y >= y0 && y < y0 + armH)
  })
}

/** Anillo: rectángulo con un hueco central de un tercio del lado. */
export function shapeRing(width: number, height: number): boolean[] {
  const holeW = Math.max(1, Math.round(width / 3))
  const holeH = Math.max(1, Math.round(height / 3))
  const x0 = Math.floor((width - holeW) / 2)
  const y0 = Math.floor((height - holeH) / 2)
  return shapeRect(width, height).map((_, id) => {
    const { x, y } = coords(id, width)
    return !(x >= x0 && x < x0 + holeW && y >= y0 && y < y0 + holeH)
  })
}

/** Rombo inscrito en el rectángulo. */
export function shapeDiamond(width: number, height: number): boolean[] {
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  return shapeRect(width, height).map((_, id) => {
    const { x, y } = coords(id, width)
    // +0.5: incluye las celdas cuyo centro toca el borde del rombo
    return Math.abs(x - cx) / (cx + 0.5) + Math.abs(y - cy) / (cy + 0.5) <= 1
  })
}

/** Grafo conexo: desde una celda jugable se llega a todas. */
function isConnected(neighbors: number[][], playable: boolean[]): boolean {
  const start = playable.indexOf(true)
  if (start === -1) return false
  const seen = new Set([start])
  const queue = [start]
  for (let i = 0; i < queue.length; i++) {
    for (const n of neighbors[queue[i]]) {
      if (!seen.has(n)) {
        seen.add(n)
        queue.push(n)
      }
    }
  }
  return seen.size === playable.filter(Boolean).length
}

/**
 * Elige hasta `count` celdas jugables para quitar (hueco o bloque) sin
 * partir el tablero en islas: una isla sin números no se puede deducir.
 */
function pickRemovable(config: BoardConfig, count: number, rng: Rng): number[] {
  const { width, height, mask, wrap } = config
  const solids = [...(config.solids ?? [])]
  const playable = (id: number) => mask?.[id] !== false && !solids.includes(id)
  const candidates = rng.shuffle(
    shapeRect(width, height)
      .map((_, id) => id)
      .filter(playable),
  )
  const picked: number[] = []
  for (const id of candidates) {
    if (picked.length >= count) break
    const next = [...solids, id]
    const neighbors = buildNeighbors({
      width,
      height,
      mask,
      wrap,
      solids: next,
    })
    const alive = shapeRect(width, height).map(
      (_, i) => mask?.[i] !== false && !next.includes(i),
    )
    if (!isConnected(neighbors, alive)) continue
    solids.push(id)
    picked.push(id)
  }
  return picked
}

/** Huecos al azar (fuera de la máscara) que dejan el tablero conexo. */
export function shapeRandomHoles(
  width: number,
  height: number,
  rng: Rng,
  ratio = 0.1,
): boolean[] {
  const holes = pickRemovable(
    { width, height, mines: 0 },
    Math.round(width * height * ratio),
    rng,
  )
  const mask = shapeRect(width, height)
  for (const id of holes) mask[id] = false
  return mask
}

// ── Variaciones combinables ─────────────────────────────────────────────

export type VariationId =
  | 'cross'
  | 'ring'
  | 'diamond'
  | 'holes'
  | 'solids'
  | 'wrap'
  | 'doubleMines'
  | 'fog'
  | 'hints'
  | 'flagLimit'

export interface Variation {
  id: VariationId
  name: string
  description: string
  /** Config nueva; no muta la recibida. */
  apply: (config: BoardConfig, rng: Rng) => BoardConfig
}

const playableCount = (c: BoardConfig) =>
  c.width * c.height -
  (c.mask?.filter((v) => !v).length ?? 0) -
  (c.solids?.length ?? 0)

/** Misma densidad de minas tras quitar celdas del tablero. */
function keepDensity(before: BoardConfig, after: BoardConfig): BoardConfig {
  const ratio = playableCount(after) / playableCount(before)
  const mines = Math.max(1, Math.round(before.mines * ratio))
  const doubleMines =
    before.doubleMines === undefined
      ? undefined
      : Math.min(before.doubleMines, mines)
  return { ...after, mines, ...(doubleMines !== undefined && { doubleMines }) }
}

/** Intersección con la máscara actual. */
const withShape = (
  config: BoardConfig,
  shape: (w: number, h: number) => boolean[],
): BoardConfig => {
  const next = shape(config.width, config.height).map(
    (v, id) => v && config.mask?.[id] !== false,
  )
  return keepDensity(config, { ...config, mask: next })
}

/** Fracción de celdas que se vuelven bloque sólido. */
const SOLID_RATIO = 0.06
/** Fracción de minas que pesan 2. */
const DOUBLE_RATIO = 0.25
const FOG_RATIO = 0.15
/** Pistas fijas: una cada tantas celdas jugables. */
const CELLS_PER_HINT = 30

export const VARIATIONS: Record<VariationId, Variation> = {
  cross: {
    id: 'cross',
    name: 'Cruz',
    description: 'El tablero tiene forma de cruz.',
    apply: (c) => withShape(c, shapeCross),
  },
  ring: {
    id: 'ring',
    name: 'Anillo',
    description: 'Un hueco en el centro del tablero.',
    apply: (c) => withShape(c, shapeRing),
  },
  diamond: {
    id: 'diamond',
    name: 'Rombo',
    description: 'El tablero tiene forma de rombo.',
    apply: (c) => withShape(c, shapeDiamond),
  },
  holes: {
    id: 'holes',
    name: 'Agujeros',
    description: 'Faltan celdas sueltas en el tablero.',
    apply: (c, rng) => {
      const holes = pickRemovable(c, Math.round(playableCount(c) * 0.1), rng)
      const mask = c.mask?.slice() ?? shapeRect(c.width, c.height)
      for (const id of holes) mask[id] = false
      return keepDensity(c, { ...c, mask })
    },
  },
  solids: {
    id: 'solids',
    name: 'Bloques',
    description: 'Bloques sólidos: no son minas y no cuentan como vecinos.',
    apply: (c, rng) => {
      const count = Math.max(1, Math.round(playableCount(c) * SOLID_RATIO))
      const picked = pickRemovable(c, count, rng)
      return keepDensity(c, { ...c, solids: [...(c.solids ?? []), ...picked] })
    },
  },
  wrap: {
    id: 'wrap',
    name: 'Bordes conectados',
    description: 'Los bordes opuestos son vecinos: el tablero da la vuelta.',
    apply: (c) => ({ ...c, wrap: true }),
  },
  doubleMines: {
    id: 'doubleMines',
    name: 'Minas dobles',
    description: 'Algunas minas valen 2. Clic derecho otra vez marca 🚩×2.',
    apply: (c) => ({
      ...c,
      doubleMines: Math.max(1, Math.round(c.mines * DOUBLE_RATIO)),
    }),
  },
  fog: {
    id: 'fog',
    name: 'Niebla',
    description: 'Algunos números se ven como ?.',
    apply: (c) => ({ ...c, fogRatio: FOG_RATIO }),
  },
  hints: {
    id: 'hints',
    name: 'Pistas fijas',
    description: 'Algunas celdas empiezan reveladas.',
    apply: (c) => ({
      ...c,
      hints: Math.max(1, Math.round(playableCount(c) / CELLS_PER_HINT)),
    }),
  },
  flagLimit: {
    id: 'flagLimit',
    name: 'Banderas contadas',
    description: 'Solo tienes tantas banderas como minas.',
    apply: (c) => ({ ...c, limitFlags: true }),
  },
}

/**
 * Orden fijo al combinar: primero lo que cambia qué celdas existen (formas,
 * bloques), luego lo que depende del número de minas y celdas.
 */
const ORDER: VariationId[] = [
  'cross',
  'ring',
  'diamond',
  'holes',
  'solids',
  'wrap',
  'doubleMines',
  'fog',
  'hints',
  'flagLimit',
]

/** Aplica varias variaciones a una config base. Determinista por semilla. */
export function applyVariations(
  base: BoardConfig,
  ids: readonly VariationId[],
  seed: number | string,
): BoardConfig {
  const rng = createRng(`${seed}:variations`)
  return ORDER.filter((id) => ids.includes(id)).reduce(
    (config, id) => VARIATIONS[id].apply(config, rng),
    base,
  )
}
