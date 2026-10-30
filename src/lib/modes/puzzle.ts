import type { Mechanic } from '@/lib/puzzle/levels'

/**
 * Estrellas de un nivel como bitmask: cada una se gana (y se paga) por
 * separado, así que no basta con contarlas.
 */
export const STAR = {
  /** Completar el nivel. */
  complete: 1,
  /** Bajo el tiempo objetivo. */
  time: 2,
  /** Sin power-ups. */
  noPowerUps: 4,
} as const

export const ALL_STARS = STAR.complete | STAR.time | STAR.noPowerUps

export const STAR_LABELS: [bit: number, label: string][] = [
  [STAR.complete, 'Completar el nivel'],
  [STAR.time, 'Bajo el tiempo objetivo'],
  [STAR.noPowerUps, 'Sin power-ups'],
]

/** Estrellas de una partida. Perder no da ninguna. */
export function starsFor(r: {
  won: boolean
  timeMs: number
  targetMs: number
  usedPowerUps: number
}): number {
  if (!r.won) return 0
  let stars = STAR.complete
  if (r.timeMs <= r.targetMs) stars |= STAR.time
  if (r.usedPowerUps === 0) stars |= STAR.noPowerUps
  return stars
}

export function countStars(mask: number): number {
  let n = 0
  for (let m = mask; m; m &= m - 1) n++
  return n
}

/** Estrellas de `next` que no estaban en `prev`. */
export const newStarsOf = (prev: number, next: number) => next & ~prev

/** Se puede jugar hasta el siguiente al último completado. */
export const isUnlocked = (level: number, maxLevel = 0) => level <= maxLevel + 1

/** Nivel de la URL: entero ≥ 1 sin ceros a la izquierda, o null. */
export function parseLevel(param: string | undefined): number | null {
  if (!param || !/^[1-9]\d{0,8}$/.test(param)) return null
  return Number(param)
}

/** Niveles por página del selector (el modo es infinito). */
export const LEVELS_PER_PAGE = 50

/** Página (desde 0) que contiene `level`. */
export const pageOf = (level: number) =>
  Math.floor((level - 1) / LEVELS_PER_PAGE)

/** Tutorial corto del nivel que presenta cada mecánica. */
export const TUTORIALS: Record<
  Mechanic,
  { icon: string; title: string; body: string }
> = {
  solids: {
    icon: '🧱',
    title: 'Bloques sólidos',
    body: 'Las celdas rayadas son bloques: no tienen minas y no cuentan como vecinas. Los números solo miran las celdas jugables.',
  },
  shapes: {
    icon: '🔷',
    title: 'Formas',
    body: 'El tablero ya no es un rectángulo. Los huecos no existen: no son vecinos de nadie.',
  },
  hints: {
    icon: '🔵',
    title: 'Pistas fijas',
    body: 'Algunas celdas empiezan reveladas (borde azul). Úsalas desde el primer momento.',
  },
  doubleMines: {
    icon: '💣',
    title: 'Minas dobles',
    body: 'Algunas minas valen 2: los números suman su peso. Clic derecho (o mantener pulsado) cicla 🚩 → 🚩×2 → nada. El chording suma tus banderas con su peso.',
  },
  fog: {
    icon: '🌫️',
    title: 'Niebla',
    body: 'Algunos números se ven como ?. Esas celdas son seguras, pero no te dicen nada: deduce con las demás.',
  },
  wrap: {
    icon: '🔄',
    title: 'Bordes conectados',
    body: 'El tablero da la vuelta: la columna de la izquierda es vecina de la derecha, y la fila de arriba de la de abajo.',
  },
  flagLimit: {
    icon: '🚩',
    title: 'Banderas contadas',
    body: 'Tienes exactamente tantas banderas como minas. El contador muestra las que te quedan.',
  },
}
