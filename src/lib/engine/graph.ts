import type { Board } from './types'

/** Celda jugable: dentro de la máscara y no sólida. */
export function isPlayable(board: Board, id: number): boolean {
  return board.mask?.[id] !== false && !board.cells[id].solid
}

export function playableIds(board: Board): number[] {
  return board.cells.filter((c) => isPlayable(board, c.id)).map((c) => c.id)
}

export function index(x: number, y: number, width: number): number {
  return y * width + x
}

export function coords(id: number, width: number): { x: number; y: number } {
  return { x: id % width, y: Math.floor(id / width) }
}

export interface NeighborOptions {
  width: number
  height: number
  mask?: boolean[]
  wrap?: boolean
  solids?: number[]
}

/**
 * Lista de adyacencia de 8 direcciones. Las celdas fuera de la máscara o
 * sólidas no tienen vecinos ni aparecen como vecinas de otras.
 */
export function buildNeighbors({
  width,
  height,
  mask,
  wrap = false,
  solids = [],
}: NeighborOptions): number[][] {
  const total = width * height
  const solidSet = new Set(solids)
  const playable = (id: number) =>
    (mask ? mask[id] !== false : true) && !solidSet.has(id)

  const neighbors: number[][] = []
  for (let id = 0; id < total; id++) {
    if (!playable(id)) {
      neighbors.push([])
      continue
    }
    const { x, y } = coords(id, width)
    // Set: en tableros pequeños con wrap varias direcciones caen en la misma celda
    const found = new Set<number>()
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        let nx = x + dx
        let ny = y + dy
        if (wrap) {
          nx = (nx + width) % width
          ny = (ny + height) % height
        } else if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue
        }
        const nid = index(nx, ny, width)
        if (nid !== id && playable(nid)) found.add(nid)
      }
    }
    neighbors.push([...found])
  }
  return neighbors
}
