import { useEffect, useState } from 'react'
import { elapsedMs, useGameStore } from '@/store/useGameStore'

const TICK_MS = 100

/**
 * Milisegundos de la partida actual. Solo corre en `playing`; se calcula
 * desde `startedAt` en cada tick para no acumular drift.
 */
export function useTimer(): number {
  const status = useGameStore((s) => s.status)
  const startedAt = useGameStore((s) => s.startedAt)
  const endedAt = useGameStore((s) => s.endedAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (status !== 'playing') return
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [status])

  return elapsedMs(startedAt, endedAt, now)
}
