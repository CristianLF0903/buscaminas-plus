import { describe, expect, it } from 'vitest'
import { solve } from '@/lib/engine/solver'
import { generateLevel, getLevelConfig } from '@/lib/puzzle/levels'

// Lento: genera y resuelve 100 niveles. `npm run test:slow`
describe('niveles 1–100', () => {
  it('todos generan tableros resolubles sin adivinar y sin bajar minas', () => {
    for (let n = 1; n <= 100; n++) {
      const level = getLevelConfig(n)
      const { board, guaranteed, config } = generateLevel(n)
      expect(guaranteed, `nivel ${n}`).toBe(true)
      expect(config.mines, `nivel ${n} usó el fallback`).toBe(
        level.config.mines,
      )
      expect(solve(board, level.firstClick).solved, `nivel ${n}`).toBe(true)
    }
  })
})
