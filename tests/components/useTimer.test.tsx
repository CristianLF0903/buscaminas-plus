import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimer } from '@/hooks/useTimer'
import { useGameStore } from '@/store/useGameStore'

const state = () => useGameStore.getState()

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    state().newGame({ width: 9, height: 9, mines: 10 }, 'timer')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no corre antes del primer clic', () => {
    const { result } = renderHook(() => useTimer())
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current).toBe(0)
  })

  it('corre en playing y se detiene al terminar', () => {
    const { result } = renderHook(() => useTimer())
    act(() => state().reveal(40))
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current).toBe(2000)

    const mine = state().board.cells.find((c) => c.mineWeight > 0)!
    act(() => state().reveal(mine.id))
    act(() => vi.advanceTimersByTime(5000))
    expect(state().status).toBe('lost')
    expect(result.current).toBe(2000)
  })
})
