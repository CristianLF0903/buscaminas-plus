import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Board from '@/components/board/Board'
import { boardLayout, CELL_PX, MIN_CELL_PX } from '@/hooks/useBoardOrientation'
import { CLASSIC_PRESETS } from '@/lib/modes/classic'
import { useGameStore } from '@/store/useGameStore'

const HARD = CLASSIC_PRESETS.hard.config

function setViewport(width: number, portrait: boolean) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(orientation: portrait)' && portrait,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

const ids = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-id]')).map((el) =>
    Number(el.dataset.id),
  )

describe('boardLayout', () => {
  it('difícil en un móvil vertical se gira y cabe sin scroll horizontal', () => {
    const { transposed, cellPx } = boardLayout(30, 16, 375, true)
    expect(transposed).toBe(true)
    // 16 columnas + separaciones dentro de 375 − 40 de márgenes
    expect(16 * cellPx + 15 * 2).toBeLessThanOrEqual(335)
    expect(cellPx).toBeGreaterThanOrEqual(MIN_CELL_PX)
  })

  it('no gira en horizontal, en tableros altos ni si ya cabe', () => {
    expect(boardLayout(30, 16, 812, false).transposed).toBe(false)
    expect(boardLayout(16, 30, 375, true).transposed).toBe(false)
    expect(boardLayout(9, 9, 375, true)).toEqual({
      transposed: false,
      cellPx: CELL_PX,
    })
    expect(boardLayout(30, 16, 1400, true).transposed).toBe(false)
  })
})

describe('Board transpuesto', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(HARD, 'transpose')
  })

  afterEach(() => {
    cleanup()
    setViewport(1024, false)
  })

  it('portrait 375 px y 30×16: 16 columnas, fila visual = columna del tablero', () => {
    setViewport(375, true)
    render(<Board />)
    const grid = screen.getByRole('grid')
    expect(grid.dataset.transposed).toBe('true')
    expect(grid.style.gridTemplateColumns).toBe('repeat(16, var(--cell))')
    // Primera fila visual: x = 0, y = 0..15 → ids 0, 30, 60…
    expect(ids().slice(0, 3)).toEqual([0, HARD.width, 2 * HARD.width])
    expect(ids()).toHaveLength(HARD.width * HARD.height)
  })

  it('en escritorio se dibuja normal', () => {
    setViewport(1400, false)
    render(<Board />)
    const grid = screen.getByRole('grid')
    expect(grid.style.gridTemplateColumns).toBe('repeat(30, var(--cell))')
    expect(ids().slice(0, 3)).toEqual([0, 1, 2])
  })

  it('clic y bandera actúan sobre la celda real, no la posición visual', () => {
    setViewport(375, true)
    render(<Board />)
    const target = document.querySelector<HTMLElement>(
      `[data-id="${HARD.width}"]`,
    )!
    fireEvent.contextMenu(target)
    expect(useGameStore.getState().board.cells[HARD.width].flagged).toBe(true)
    expect(useGameStore.getState().board.cells[1].flagged).toBe(false)
  })
})
