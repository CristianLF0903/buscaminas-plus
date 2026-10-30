import { describe, expect, it } from 'vitest'
import { generateNoGuess } from '@/lib/engine/generate'
import { coords } from '@/lib/engine/graph'
import {
  addTime,
  boardFailed,
  boardFirstClick,
  boardSeed,
  boardSolved,
  createSession,
  endSession,
  MINE_PENALTY_MS,
  pauseSession,
  remainingMs,
  resumeSession,
  solveBonusMs,
  START_MS,
  startSession,
  tick,
  TIME_ATTACK_CONFIG,
} from '@/lib/modes/timeAttack'

const T0 = 1_000_000
const started = () => startSession(createSession(), T0)

describe('bonus por tablero', () => {
  it('empieza en 20 s y baja 1 s cada tres tableros', () => {
    expect(solveBonusMs(1)).toBe(20_000)
    expect(solveBonusMs(3)).toBe(20_000)
    expect(solveBonusMs(4)).toBe(19_000)
    expect(solveBonusMs(7)).toBe(18_000)
  })

  it('nunca baja de 10 s', () => {
    expect(solveBonusMs(31)).toBe(10_000)
    expect(solveBonusMs(500)).toBe(10_000)
  })
})

describe('tableros', () => {
  it('semilla distinta por tablero y reproducible', () => {
    expect(boardSeed(42, 1)).toBe(boardSeed(42, 1))
    expect(boardSeed(42, 1)).not.toBe(boardSeed(42, 2))
  })

  it('primer clic fijo y lejos del borde', () => {
    const { width, height } = TIME_ATTACK_CONFIG
    for (let n = 1; n <= 50; n++) {
      const seed = boardSeed(7, n)
      const id = boardFirstClick(seed)
      expect(boardFirstClick(seed)).toBe(id)
      const { x, y } = coords(id, width)
      expect(x).toBeGreaterThanOrEqual(2)
      expect(x).toBeLessThanOrEqual(width - 3)
      expect(y).toBeGreaterThanOrEqual(2)
      expect(y).toBeLessThanOrEqual(height - 3)
    }
  })

  it('el primer clic es seguro en el tablero generado', () => {
    const seed = boardSeed(99, 3)
    const first = boardFirstClick(seed)
    const { board } = generateNoGuess(TIME_ATTACK_CONFIG, seed, first)
    expect(board.cells[first].mineWeight).toBe(0)
    expect(board.cells[first].adjacent).toBe(0)
  })
})

describe('reloj de la sesión', () => {
  it('cuenta hacia atrás desde 60 s', () => {
    const s = started()
    expect(remainingMs(s, T0)).toBe(START_MS)
    expect(remainingMs(s, T0 + 15_000)).toBe(45_000)
  })

  it('no corre antes de empezar', () => {
    expect(remainingMs(createSession(), T0 + 99_000)).toBe(START_MS)
  })

  it('resolver suma el bonus al tiempo restante', () => {
    const s = boardSolved(started(), T0 + 10_000)
    expect(s.solved).toBe(1)
    expect(remainingMs(s, T0 + 10_000)).toBe(70_000)
    expect(remainingMs(s, T0 + 20_000)).toBe(60_000)
  })

  it('pisar mina resta 10 s y sigue la sesión', () => {
    const s = boardFailed(started(), T0 + 5_000)
    expect(s.failed).toBe(1)
    expect(s.status).toBe('running')
    expect(remainingMs(s, T0 + 5_000)).toBe(START_MS - 5_000 - MINE_PENALTY_MS)
  })

  it('pisar mina sin tiempo suficiente termina la sesión', () => {
    const s = boardFailed(started(), T0 + 55_000)
    expect(s.status).toBe('over')
    expect(s.endedAt).toBe(T0 + 55_000)
    expect(remainingMs(s, T0 + 60_000)).toBe(0)
  })

  it('termina al llegar a 0', () => {
    const s = started()
    expect(tick(s, T0 + 59_999).status).toBe('running')
    const over = tick(s, T0 + 60_000)
    expect(over.status).toBe('over')
    expect(over.endedAt).toBe(T0 + 60_000)
  })

  it('pausado no descuenta tiempo', () => {
    const paused = pauseSession(started(), T0 + 10_000)
    expect(paused.status).toBe('paused')
    expect(remainingMs(paused, T0 + 40_000)).toBe(50_000)
    expect(tick(paused, T0 + 999_000).status).toBe('paused')
    const resumed = resumeSession(paused, T0 + 40_000)
    expect(remainingMs(resumed, T0 + 45_000)).toBe(45_000)
  })

  it('Tiempo+ suma al reloj', () => {
    const s = addTime(started(), T0 + 30_000, 15_000)
    expect(remainingMs(s, T0 + 30_000)).toBe(45_000)
  })

  it('una sesión terminada no cambia', () => {
    const over = tick(started(), T0 + 60_000)
    expect(boardSolved(over, T0 + 61_000)).toBe(over)
    expect(boardFailed(over, T0 + 61_000)).toBe(over)
    expect(addTime(over, T0 + 61_000, 15_000)).toBe(over)
  })

  it('salir a mitad termina la sesión con el tiempo que quedaba', () => {
    const s = endSession(boardSolved(started(), T0 + 10_000), T0 + 20_000)
    expect(s.status).toBe('over')
    expect(s.solved).toBe(1)
    expect(s.endedAt).toBe(T0 + 20_000)
    expect(endSession(createSession(), T0).status).toBe('idle')
  })
})
