import { describe, expect, it } from 'vitest'
import { buildNeighbors, coords, index } from '@/lib/engine/graph'

describe('index / coords', () => {
  it('son inversas', () => {
    const width = 7
    for (let id = 0; id < 35; id++) {
      const { x, y } = coords(id, width)
      expect(index(x, y, width)).toBe(id)
    }
  })
})

describe('buildNeighbors', () => {
  it('rectangular: esquina 3, borde 5, centro 8', () => {
    const width = 9
    const n = buildNeighbors({ width, height: 9 })
    expect(n[index(0, 0, width)]).toHaveLength(3)
    expect(n[index(8, 8, width)]).toHaveLength(3)
    expect(n[index(4, 0, width)]).toHaveLength(5)
    expect(n[index(0, 4, width)]).toHaveLength(5)
    expect(n[index(4, 4, width)]).toHaveLength(8)
  })

  it('es simétrico', () => {
    const n = buildNeighbors({ width: 6, height: 4 })
    n.forEach((list, id) => {
      for (const other of list) expect(n[other]).toContain(id)
    })
  })

  it('con wrap todas las celdas tienen 8 vecinos', () => {
    const width = 5
    const n = buildNeighbors({ width, height: 4, wrap: true })
    for (const list of n) expect(list).toHaveLength(8)
    expect(n[index(0, 0, width)]).toContain(index(4, 3, width))
  })

  it('celdas sólidas no aparecen como vecinas ni tienen vecinos', () => {
    const width = 3
    const center = index(1, 1, width)
    const n = buildNeighbors({ width, height: 3, solids: [center] })
    expect(n[center]).toEqual([])
    for (const list of n) expect(list).not.toContain(center)
    expect(n[index(0, 0, width)]).toHaveLength(2)
  })

  it('celdas fuera de la máscara no aparecen como vecinas', () => {
    const width = 3
    // Cruz: solo centro y ortogonales
    const mask = [false, true, false, true, true, true, false, true, false]
    const n = buildNeighbors({ width, height: 3, mask })
    mask.forEach((inside, id) => {
      if (!inside) {
        expect(n[id]).toEqual([])
        for (const list of n) expect(list).not.toContain(id)
      }
    })
    expect(n[index(1, 1, width)]).toHaveLength(4)
  })
})
