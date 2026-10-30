import { beforeEach, describe, expect, it } from 'vitest'
import { solve } from '@/lib/engine/solver'
import { elapsedMs, selectMinesLeft, useGameStore } from '@/store/useGameStore'

const state = () => useGameStore.getState()

describe('useGameStore', () => {
  beforeEach(() => {
    state().newGame({ width: 9, height: 9, mines: 10 }, 'test')
  })

  it('arranca en idle, sin minas ni timer', () => {
    expect(state().status).toBe('idle')
    expect(state().startedAt).toBeNull()
    expect(state().board.cells.every((c) => c.mineWeight === 0)).toBe(true)
  })

  it('el primer reveal pasa a playing y nunca pierde', () => {
    // Tablero denso para forzar el caso límite
    for (let seed = 0; seed < 50; seed++) {
      state().newGame({ width: 9, height: 9, mines: 72 }, seed)
      state().reveal((seed * 11) % 81)
      expect(state().status).not.toBe('lost')
      expect(state().startedAt).not.toBeNull()
    }
    state().newGame({ width: 16, height: 16, mines: 40 }, 'x')
    state().reveal(100)
    expect(state().status).toBe('playing')
  })

  it('las banderas antes del primer clic no inician la partida', () => {
    state().toggleFlag(0)
    expect(state().status).toBe('idle')
    expect(state().startedAt).toBeNull()
    expect(state().flagsUsed).toBe(1)
    expect(selectMinesLeft(state())).toBe(9)
  })

  it('al perder revela las minas y fija endedAt', () => {
    state().reveal(40)
    const mine = state().board.cells.find((c) => c.mineWeight > 0)!
    state().reveal(mine.id)
    expect(state().status).toBe('lost')
    expect(state().endedAt).not.toBeNull()
    const mines = state().board.cells.filter((c) => c.mineWeight > 0)
    expect(mines.every((c) => c.revealed)).toBe(true)
  })

  it('ignora jugadas con la partida terminada', () => {
    state().reveal(40)
    const mine = state().board.cells.find((c) => c.mineWeight > 0)!
    state().reveal(mine.id)
    const board = state().board
    state().toggleFlag(0)
    state().reveal(0)
    expect(state().board).toBe(board)
  })

  it('misma semilla y primer clic dan el mismo tablero', () => {
    state().reveal(40)
    const a = state().board
    state().newGame({ width: 9, height: 9, mines: 10 }, 'test')
    state().reveal(40)
    expect(state().board).toEqual(a)
  })

  it('reset conserva la semilla solo si era fija', () => {
    state().reset()
    expect(state().seed).toBe('test')
    state().newGame({ width: 9, height: 9, mines: 10 })
    const seed = state().seed
    expect(typeof seed).toBe('number')
    state().reveal(0)
    state().reset()
    expect(state().status).toBe('idle')
    expect(state().config).toEqual({ width: 9, height: 9, mines: 10 })
  })
})

describe('elapsedMs', () => {
  it('es 0 antes del primer clic', () => {
    expect(elapsedMs(null, null, 5000)).toBe(0)
  })

  it('usa endedAt si la partida terminó', () => {
    expect(elapsedMs(1000, 3500, 9999)).toBe(2500)
    expect(elapsedMs(1000, null, 1800)).toBe(800)
  })

  it('nunca es negativo', () => {
    expect(elapsedMs(2000, null, 1000)).toBe(0)
  })
})

describe('useGameStore con noGuess', () => {
  const config = { width: 9, height: 9, mines: 10, noGuess: true }

  it('el primer clic genera un tablero resoluble sin adivinar', async () => {
    state().newGame(config, 'ng')
    const pending = state().reveal(40)
    expect(state().generating).toBe(true)
    expect(state().startedAt).toBeNull()
    await pending
    expect(state().generating).toBe(false)
    expect(state().status).toBe('playing')
    expect(state().startedAt).not.toBeNull()
    const { board } = state()
    // El estado ya tiene celdas reveladas; el solver parte de cero
    expect(solve(board, 40).solved).toBe(true)
  })

  it('bloquea input mientras genera', async () => {
    state().newGame(config, 'ng')
    const pending = state().reveal(40)
    state().reveal(0)
    state().toggleFlag(1)
    await pending
    expect(state().board.cells[1].flagged).toBe(false)
  })

  it('descarta la generación si la partida se reinicia', async () => {
    state().newGame(config, 'ng')
    const pending = state().reveal(40)
    state().newGame({ width: 16, height: 16, mines: 40 }, 'otra')
    await pending
    expect(state().status).toBe('idle')
    expect(state().board.cells).toHaveLength(256)
  })

  it('conserva banderas puestas antes del primer clic', async () => {
    state().newGame(config, 'ng')
    state().toggleFlag(0)
    await state().reveal(40)
    expect(state().board.cells[0].flagged).toBe(true)
  })
})

describe('guaranteed', () => {
  it('es null sin noGuess y true con un tablero garantizado', async () => {
    state().newGame({ width: 9, height: 9, mines: 10 }, 'g')
    state().reveal(40)
    expect(state().guaranteed).toBeNull()
    state().newGame({ width: 9, height: 9, mines: 10, noGuess: true }, 'g')
    await state().reveal(40)
    expect(state().guaranteed).toBe(true)
  })
})

describe('loadBoard', () => {
  const config = { width: 9, height: 9, mines: 10 }
  const mined = () => {
    state().newGame(config, 'pre')
    state().reveal(40)
    // Tablero minado sin revelar, como lo entrega el generador
    const { board } = state()
    return {
      ...board,
      cells: board.cells.map((c) => ({
        ...c,
        revealed: false,
        flagged: false,
      })),
    }
  }

  it('arranca jugando con el primer clic abierto', () => {
    const board = mined()
    state().loadBoard(config, board, { seed: 'pre', firstClick: 40 })
    expect(state().status).toBe('playing')
    expect(state().startedAt).not.toBeNull()
    expect(state().board.cells[40].revealed).toBe(true)
    expect(state().seed).toBe('pre')
  })

  it('con carry conserva power-ups usados y escudo', () => {
    const board = mined()
    useGameStore.setState({ usedPowerUps: 2, shieldActive: true })
    state().loadBoard(config, board, { seed: 'a', firstClick: 40, carry: true })
    expect(state().usedPowerUps).toBe(2)
    expect(state().shieldActive).toBe(true)

    state().loadBoard(config, board, { seed: 'b', firstClick: 40 })
    expect(state().usedPowerUps).toBe(0)
    expect(state().shieldActive).toBe(false)
  })

  it('con keepShield conserva solo el escudo', () => {
    const board = mined()
    useGameStore.setState({ usedPowerUps: 3, shieldActive: true })
    state().loadBoard(config, board, {
      seed: 'a',
      firstClick: 40,
      keepShield: true,
    })
    expect(state().usedPowerUps).toBe(0)
    expect(state().shieldActive).toBe(true)
  })

  it('cada tablero es una partida nueva (gameId distinto)', () => {
    const board = mined()
    const before = state().gameId
    state().loadBoard(config, board, { seed: 'a', firstClick: 40 })
    expect(state().gameId).not.toBe(before)
  })
})
