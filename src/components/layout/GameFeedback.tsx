import { useEffect, useState } from 'react'
import { playSfx, unlockAudio, vibrate } from '@/lib/audio'
import { endRevealTiming } from '@/lib/endReveal'
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

  // Onda de minas al terminar: el modal sale al acabar o con clic/tecla
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopSkip = () => {}
    const finish = () => {
      clearTimeout(timer)
      stopSkip()
      useGameStore.getState().finishReveal()
    }
    const unsubscribe = useGameStore.subscribe((s, prev) => {
      if (s.revealing === prev.revealing) return
      clearTimeout(timer)
      stopSkip()
      if (!s.revealing) return
      const center = s.status === 'lost' ? s.explodedId : s.origin
      timer = setTimeout(finish, endRevealTiming(s.board, center).totalMs)
      // Al siguiente tick: la tecla o el clic que cerró la partida no cuenta
      const arm = setTimeout(() => {
        window.addEventListener('click', finish)
        window.addEventListener('keydown', finish)
      })
      stopSkip = () => {
        clearTimeout(arm)
        window.removeEventListener('click', finish)
        window.removeEventListener('keydown', finish)
      }
    })
    return () => {
      unsubscribe()
      clearTimeout(timer)
      stopSkip()
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
