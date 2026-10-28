/** Peso de mina: 0 = sin mina, 1 = mina normal, 2 = mina doble. */
export type MineWeight = 0 | 1 | 2

export interface Cell {
  id: number
  x: number
  y: number
  mineWeight: MineWeight
  revealed: boolean
  flagged: boolean
  /** Bloque sólido: no se juega ni cuenta como vecino. */
  solid: boolean
  /** Niebla: al revelarse muestra `?` en vez del número. */
  fog: boolean
  /** Suma de `mineWeight` de los vecinos. */
  adjacent: number
}

export interface Board {
  width: number
  height: number
  cells: Cell[]
  /** Lista de adyacencia: `neighbors[id]` son los ids vecinos de la celda. */
  neighbors: number[][]
  /** `mask[id] === false`: la celda no forma parte del tablero. */
  mask?: boolean[]
  /** Número de celdas con mina (una mina doble cuenta como 1). */
  mineCount: number
  flagLimit?: number
}

export interface BoardConfig {
  width: number
  height: number
  mines: number
  /** `mask[id] === false` deja la celda fuera del tablero (formas no rectangulares). */
  mask?: boolean[]
  /** Bordes conectados (toroide). */
  wrap?: boolean
  solids?: number[]
  doubleMines?: number
  fogRatio?: number
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'
