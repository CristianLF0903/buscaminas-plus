/** Hash cyrb53 de un string. Devuelve un entero no negativo de hasta 53 bits. */
export function hashString(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export interface Rng {
  /** Flotante en [0, 1). */
  next(): number
  /** Entero en [min, max], ambos incluidos. */
  int(min: number, max: number): number
  /** Copia barajada (Fisher-Yates); no muta el original. */
  shuffle<T>(arr: readonly T[]): T[]
}

/** PRNG mulberry32. Acepta semilla numérica o string (se hashea). */
export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1))

  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out = arr.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i)
      const tmp = out[i]
      out[i] = out[j]
      out[j] = tmp
    }
    return out
  }

  return { next, int, shuffle }
}
