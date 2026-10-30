import { useEffect, useState } from 'react'
import { playSfx, unlockAudio, vibrate } from '@/lib/audio'
import { flagWeight } from '@/lib/engine/reveal'
import type { Board } from '@/lib/engine/types'
import { useGameStore } from '@/store/useGameStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import Confetti from './Confetti'

const revealedCount = (b: Board) =>
  b.cells.reduce((n, c) => n + (c.revealed ? 1 : 0), 0)

/** Suma de banderas con su peso: detecta también 🚩 → 🚩×2. */
const flagCount = (b: Board) => b.cells.reduce((n, c) => n + flagWeight(c), 0)

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Sonidos, vibración y confeti de la partida en curso, para todos los modos.
 * Escucha el store de partida; no pinta nada salvo el confeti.
 */
export default function GameFeedback() {
  const [confetti, setConfetti] = useState<number | null>(null)

  // Los navegadores solo dejan crear audio tras un gesto
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        // Partida nueva (o tablero precargado): sin sonidos de arranque
        if (s.gameId !== prev.gameId || s.board === prev.board) return
        const settings = useSettingsStore.getState()
        const sound = (sfx: Parameters<typeof playSfx>[0]) => {
          if (settings.sound) playSfx(sfx, settings.volume)
        }
        const buzz = (pattern: number | number[]) => {
          if (settings.vibration) vibrate(pattern)
        }

        if (s.status === 'lost' && prev.status !== 'lost') {
          sound('explode')
          buzz([80, 40, 160])
          return
        }
        if (s.status === 'won' && prev.status !== 'won') {
          sound('win')
          buzz([30, 30, 30])
          if (settings.animations && !reducedMotion()) setConfetti(s.gameId)
          return
        }
        if (flagCount(s.board) !== flagCount(prev.board)) {
          sound('flag')
          buzz(25)
        } else if (revealedCount(s.board) > revealedCount(prev.board)) {
          sound('reveal')
        }
      }),
    [],
  )

  return confetti === null ? null : <Confetti key={confetti} />
}
