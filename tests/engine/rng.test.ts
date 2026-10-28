import { describe, expect, it } from 'vitest'
import { createRng, hashString } from '@/lib/engine/rng'

const take = (seed: number | string, n = 20) => {
  const rng = createRng(seed)
  return Array.from({ length: n }, () => rng.next())
}

describe('hashString', () => {
  it('es determinista', () => {
    expect(hashString('puzzle-1')).toBe(hashString('puzzle-1'))
  })

  it('strings distintos dan hashes distintos', () => {
    expect(hashString('puzzle-1')).not.toBe(hashString('puzzle-2'))
  })
})

describe('createRng', () => {
  it('misma semilla produce la misma secuencia', () => {
    expect(take(42)).toEqual(take(42))
    expect(take('2026-10-28')).toEqual(take('2026-10-28'))
  })

  it('semillas distintas producen secuencias distintas', () => {
    expect(take(1)).not.toEqual(take(2))
    expect(take('a')).not.toEqual(take('b'))
  })

  it('next está en [0, 1)', () => {
    for (const v of take(7, 1000)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int respeta el rango inclusivo y lo cubre', () => {
    const rng = createRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(2, 5)
      expect(v).toBeGreaterThanOrEqual(2)
      expect(v).toBeLessThanOrEqual(5)
      seen.add(v)
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5])
  })

  it('shuffle es una permutación reproducible y no muta el original', () => {
    const arr = Array.from({ length: 50 }, (_, i) => i)
    const a = createRng(9).shuffle(arr)
    const b = createRng(9).shuffle(arr)
    expect(a).toEqual(b)
    expect(a).not.toEqual(arr)
    expect([...a].sort((x, y) => x - y)).toEqual(arr)
    expect(arr[0]).toBe(0)
  })
})
