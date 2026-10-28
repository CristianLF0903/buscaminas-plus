import { useEffect, useState } from 'react'
import type { RewardBreakdown } from '@/lib/economy/rewards'
import { elapsedMs, useGameStore } from '@/store/useGameStore'
import type { GameState } from '@/store/useGameStore'
import { usePlayerStore } from '@/store/usePlayerStore'
import type { GameResult } from '@/store/usePlayerStore'

export type FinishedReward = RewardBreakdown & { isRecord: boolean }

/** Datos del resultado que dependen del modo (el resto sale del store). */
export type DescribeResult = (
  state: GameState,
) => Omit<GameResult, 'won' | 'timeMs' | 'usedPowerUps'>

/**
 * Al terminar cada partida registra el resultado y paga las monedas una sola
 * vez. Devuelve la recompensa de la partida actual, o null si no terminó.
 */
export function useGameRewards(
  describe: DescribeResult,
): FinishedReward | null {
  const [last, setLast] = useState<{
    gameId: number
    reward: FinishedReward
  } | null>(null)
  const gameId = useGameStore((s) => s.gameId)

  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        const over = s.status === 'won' || s.status === 'lost'
        if (!over || s.status === prev.status) return
        const reward = usePlayerStore.getState().finishGame({
          ...describe(s),
          won: s.status === 'won',
          timeMs: elapsedMs(s.startedAt, s.endedAt, s.endedAt ?? 0),
          usedPowerUps: s.usedPowerUps,
        })
        setLast({ gameId: s.gameId, reward })
      }),
    [describe],
  )

  return last?.gameId === gameId ? last.reward : null
}
