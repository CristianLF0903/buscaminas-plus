import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '@/store/useGameStore'
import { resetPlayer, usePlayerStore } from '@/store/usePlayerStore'

const game = () => useGameStore.getState()
const player = () => usePlayerStore.getState()

/** Partida fácil empezada con el primer clic en el centro. */
function startGame() {
  game().newGame({ width: 9, height: 9, mines: 10 }, 'pu')
  game().reveal(40)
}

const hiddenMine = () =>
  game().board.cells.find((c) => c.mineWeight > 0 && !c.flagged)!

const hiddenSafe = () =>
  game().board.cells.find((c) => c.mineWeight === 0 && !c.revealed)!

describe('power-ups en partida', () => {
  beforeEach(() => {
    resetPlayer()
    localStorage.clear()
    for (const id of ['radar', 'shield', 'detector', 'hint'] as const) {
      player().addPowerUp(id, 5)
    }
  })

  it('no se usan fuera de playing', () => {
    game().newGame({ width: 9, height: 9, mines: 10 }, 'pu')
    expect(game().activatePowerUp('shield')).toBe(false)
    expect(player().inventory.shield).toBe(5)
  })

  it('no se usan sin inventario', () => {
    resetPlayer()
    startGame()
    expect(game().activatePowerUp('shield')).toBe(false)
  })

  it('escudo: la próxima mina no hace perder y se consume una vez', () => {
    startGame()
    expect(game().activatePowerUp('shield')).toBe(true)
    expect(game().activatePowerUp('shield')).toBe(false)
    expect(player().inventory.shield).toBe(4)
    const mine = hiddenMine()
    game().reveal(mine.id)
    expect(game().status).toBe('playing')
    expect(game().board.cells[mine.id].flagged).toBe(true)
    expect(game().shieldActive).toBe(false)
    expect(game().notice).toMatch(/escudo/i)
    game().reveal(hiddenMine().id)
    expect(game().status).toBe('lost')
  })

  it('radar: espera celda, se cobra al aplicarse y se cancela gratis', () => {
    startGame()
    expect(game().activatePowerUp('radar')).toBe(true)
    expect(game().activePowerUp).toBe('radar')
    game().cancelPowerUp()
    expect(game().activePowerUp).toBeNull()
    expect(player().inventory.radar).toBe(5)

    game().activatePowerUp('radar')
    const mine = hiddenMine()
    expect(game().targetCell(mine.id)).toBe(true)
    expect(game().status).not.toBe('lost')
    expect(game().board.cells[mine.id].flagged).toBe(true)
    expect(player().inventory.radar).toBe(4)
    expect(game().usedPowerUps).toBe(1)
  })

  it('detector: marca si es mina sin revelar', () => {
    startGame()
    game().activatePowerUp('detector')
    const mine = hiddenMine()
    game().targetCell(mine.id)
    expect(game().detected[mine.id]).toBe(true)
    expect(game().board.cells[mine.id].revealed).toBe(false)
    expect(player().inventory.detector).toBe(4)
  })

  it('detector no cobra dos veces la misma celda', () => {
    startGame()
    const target = hiddenSafe().id
    game().activatePowerUp('detector')
    game().targetCell(target)
    game().activatePowerUp('detector')
    expect(game().targetCell(target)).toBe(false)
    expect(player().inventory.detector).toBe(4)
  })

  it('detector sobre celda revelada no se consume', () => {
    startGame()
    game().activatePowerUp('detector')
    expect(game().targetCell(40)).toBe(false)
    expect(player().inventory.detector).toBe(5)
    expect(game().activePowerUp).toBe('detector')
  })

  it('pista: resalta una deducción, o no se consume si no hay', () => {
    startGame()
    const used = game().activatePowerUp('hint')
    if (used) {
      const { hint } = game()
      expect(hint).not.toBeNull()
      const cell = game().board.cells[hint!.id]
      expect(cell.mineWeight > 0).toBe(hint!.kind === 'mine')
      expect(player().inventory.hint).toBe(4)
      // La siguiente jugada borra el resaltado
      game().reveal(hiddenSafe().id)
      expect(game().hint).toBeNull()
    } else {
      expect(player().inventory.hint).toBe(5)
      expect(game().notice).toMatch(/No hay ninguna deducción/)
    }
  })

  it('límite de 3 por partida', () => {
    startGame()
    game().activatePowerUp('shield')
    const targets = game()
      .board.cells.filter((c) => !c.revealed)
      .slice(0, 2)
    for (const c of targets) {
      game().activatePowerUp('detector')
      expect(game().targetCell(c.id)).toBe(true)
    }
    expect(game().usedPowerUps).toBe(3)
    expect(game().activatePowerUp('radar')).toBe(false)
    expect(game().activatePowerUp('hint')).toBe(false)
    expect(player().inventory.radar).toBe(5)
  })

  it('se reinicia en partida nueva', () => {
    startGame()
    game().activatePowerUp('shield')
    game().reset()
    expect(game().usedPowerUps).toBe(0)
    expect(game().shieldActive).toBe(false)
    expect(game().detected).toEqual({})
  })

  it('usedPowerUps llega al resultado y quita el bonus', () => {
    startGame()
    game().activatePowerUp('detector')
    game().targetCell(hiddenSafe().id)
    const reward = player().finishGame({
      mode: 'classic',
      difficulty: 'easy',
      won: true,
      timeMs: 1000,
      usedPowerUps: game().usedPowerUps,
    })
    expect(reward.noPowerUpBonus).toBe(0)
  })
})
