import { describe, expect, it } from 'vitest'
import { coords } from '@/lib/engine/graph'
import { createBoardQueue, seededFirstClick } from '@/lib/modes/boardQueue'
import { CLASSIC_PRESETS } from '@/lib/modes/classic'
import {
  boardLost,
  boardSeed,
  boardWon,
  createRun,
  endlessConfig,
  endRun,
  nextBoard,
  startRun,
} from '@/lib/modes/endless'

const T0 = 1_000_000
const started = () => startRun(createRun(), T0)

describe('config', () => {
  it('usa los presets del clásico con el toggle sin adivinar', () => {
    expect(endlessConfig('hard', false)).toEqual({
      ...CLASSIC_PRESETS.hard.config,
      noGuess: false,
    })
    expect(endlessConfig('easy', true).noGuess).toBe(true)
  })

  it('semilla distinta por tablero y reproducible', () => {
    expect(boardSeed(1, 2)).toBe(boardSeed(1, 2))
    expect(boardSeed(1, 2)).not.toBe(boardSeed(1, 3))
  })
})

describe('racha', () => {
  it('empieza en el tablero 1', () => {
    const r = started()
    expect(r).toMatchObject({ status: 'playing', board: 1, startedAt: T0 })
    expect(startRun(r, T0 + 1)).toBe(r)
  })

  it('ganar pasa a la transición y suma power-ups', () => {
    const r = boardWon(started(), 2)
    expect(r).toMatchObject({ status: 'between', solved: 1, usedPowerUps: 2 })
    // Ganar dos veces el mismo tablero no cuenta doble
    expect(boardWon(r, 1)).toBe(r)
  })

  it('el siguiente tablero vuelve a jugar', () => {
    const r = nextBoard(boardWon(started(), 0))
    expect(r).toMatchObject({ status: 'playing', board: 2, solved: 1 })
    expect(nextBoard(r)).toBe(r)
  })

  it('perder termina la racha', () => {
    const r = boardLost(nextBoard(boardWon(started(), 1)), 2, T0 + 500)
    expect(r).toMatchObject({
      status: 'over',
      board: 2,
      solved: 1,
      usedPowerUps: 3,
      endedAt: T0 + 500,
    })
    expect(boardLost(r, 1, T0 + 900)).toBe(r)
  })

  it('salir termina la racha sin contar doble los power-ups', () => {
    expect(endRun(started(), 1, T0 + 10)).toMatchObject({
      status: 'over',
      usedPowerUps: 1,
    })
    // En la transición los power-ups del tablero ya se sumaron
    const between = boardWon(started(), 2)
    expect(endRun(between, 2, T0 + 10)).toMatchObject({
      status: 'over',
      solved: 1,
      usedPowerUps: 2,
    })
    expect(endRun(createRun(), 0, T0)).toEqual(createRun())
  })
})

describe('cola de tableros', () => {
  it('primer clic dentro del tablero y lejos del borde', () => {
    const { width, height } = CLASSIC_PRESETS.hard.config
    for (let n = 1; n <= 30; n++) {
      const { x, y } = coords(
        seededFirstClick(CLASSIC_PRESETS.hard.config, boardSeed(5, n)),
        width,
      )
      expect(x).toBeGreaterThanOrEqual(2)
      expect(x).toBeLessThanOrEqual(width - 3)
      expect(y).toBeGreaterThanOrEqual(2)
      expect(y).toBeLessThanOrEqual(height - 3)
    }
  })

  it('genera tableros reproducibles con el primer clic seguro', async () => {
    for (const noGuess of [false, true]) {
      const config = endlessConfig('easy', noGuess)
      const queue = createBoardQueue(config, (n) => boardSeed(7, n))
      const a = await queue.preload(1)
      expect(a.board.cells[a.firstClick].mineWeight).toBe(0)
      expect(a.board.cells[a.firstClick].adjacent).toBe(0)
      expect(a.guaranteed).toBe(noGuess ? true : null)

      const again = createBoardQueue(config, (n) => boardSeed(7, n))
      expect((await again.preload(1)).board).toEqual(a.board)
    }
  })

  it('cada tablero se genera una vez y se puede liberar', async () => {
    const queue = createBoardQueue(endlessConfig('easy', false), String)
    expect(queue.get(1)).toBeUndefined()
    const p = queue.preload(1)
    expect(queue.preload(1)).toBe(p)
    await p
    expect(queue.get(1)).toBeDefined()
    queue.drop(1)
    expect(queue.get(1)).toBeUndefined()
  })
})
