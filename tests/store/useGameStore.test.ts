import { beforeEach, describe, expect, it } from 'vitest'
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
