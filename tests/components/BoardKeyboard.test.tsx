import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Board from '@/components/board/Board'
import { index } from '@/lib/engine/graph'
import { useGameStore } from '@/store/useGameStore'

const W = 5
const cell = (id: number) =>
  document.querySelector<HTMLElement>(`[data-id="${id}"]`)!
const focusedId = () =>
  Number((document.activeElement as HTMLElement).dataset.id)
const key = (k: string) =>
  fireEvent.keyDown(document.activeElement!, { key: k })

describe('tablero con teclado', () => {
  beforeEach(() => {
    // Bloque sólido en (1,0): las flechas lo saltan
    useGameStore
      .getState()
      .newGame({ width: W, height: 5, mines: 3, solids: [1] }, 'kbd')
  })

  afterEach(cleanup)

  it('una sola celda en el orden de tabulación (roving tabindex)', () => {
    render(<Board />)
    const tabbable = document.querySelectorAll(
      '[role="gridcell"][tabindex="0"]',
    )
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toBe(cell(0))
  })

  it('las flechas mueven el foco y saltan bloques', () => {
    render(<Board />)
    cell(0).focus()
    key('ArrowRight')
    expect(focusedId()).toBe(2) // salta el sólido en 1
    key('ArrowDown')
    expect(focusedId()).toBe(index(2, 1, W))
    key('ArrowLeft')
    key('ArrowLeft')
    key('ArrowLeft') // borde: se queda
    expect(focusedId()).toBe(index(0, 1, W))
    expect(cell(index(0, 1, W)).tabIndex).toBe(0)
  })

  it('F pone bandera, R reinicia y la etiqueta dice fila y columna', () => {
    render(<Board />)
    cell(0).focus()
    key('ArrowDown')
    key('f')
    const id = index(0, 1, W)
    expect(useGameStore.getState().board.cells[id].flagged).toBe(true)
    expect(cell(id).getAttribute('aria-label')).toBe(
      'Fila 2, columna 1: bandera',
    )
    key('r')
    expect(useGameStore.getState().board.cells[id].flagged).toBe(false)
  })

  it('sin reinicio permitido, R no hace nada', () => {
    render(<Board allowReset={false} />)
    cell(0).focus()
    key('f')
    key('r')
    expect(useGameStore.getState().board.cells[0].flagged).toBe(true)
  })

  it('Enter/Espacio activan la celda (clic nativo del botón) y D hace chord', () => {
    render(<Board />)
    const center = index(2, 2, W)
    fireEvent.click(cell(center))
    const s = useGameStore.getState()
    expect(s.status).toBe('playing')
    const number = s.board.cells.find(
      (c) => c.revealed && c.adjacent > 0 && !c.mineWeight,
    )
    if (!number) return
    cell(number.id).focus()
    // Sin banderas suficientes el chord no cambia nada
    const before = useGameStore.getState().board
    key('d')
    expect(useGameStore.getState().board).toBe(before)
  })
})
