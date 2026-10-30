import { useEffect, useMemo } from 'react'
import type { GameMode } from '@/lib/economy/rewards'
import { MAX_POWER_UPS_PER_GAME } from '@/lib/powerups'
import { isAllowedIn, POWER_UPS } from '@/lib/powerups/catalog'
import { POWER_UP_IDS } from '@/lib/powerups/ids'
import { canUsePowerUps, useGameStore } from '@/store/useGameStore'
import { usePlayerStore } from '@/store/usePlayerStore'

const TARGET_PROMPT: Partial<Record<string, string>> = {
  radar: 'Elige el centro del área a despejar',
  detector: 'Elige una celda oculta para analizar',
}

export default function PowerUpBar({ mode }: { mode: GameMode }) {
  const inventory = usePlayerStore((s) => s.inventory)
  const usable = useGameStore(canUsePowerUps)
  const used = useGameStore((s) => s.usedPowerUps)
  const active = useGameStore((s) => s.activePowerUp)
  const shieldActive = useGameStore((s) => s.shieldActive)
  const notice = useGameStore((s) => s.notice)
  const activate = useGameStore((s) => s.activatePowerUp)
  const cancel = useGameStore((s) => s.cancelPowerUp)

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, cancel])

  const ids = useMemo(
    () => POWER_UP_IDS.filter((id) => isAllowedIn(id, mode)),
    [mode],
  )

  // Teclas 1–5: power-ups en el orden de la barra
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, dialog')) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1 || n > ids.length) return
      e.preventDefault()
      activate(ids[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ids, activate])

  if (ids.length === 0) return null

  const message = active
    ? `${TARGET_PROMPT[active]} · Esc para cancelar`
    : notice

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ids.map((id, i) => {
          const def = POWER_UPS[id]
          const count = inventory[id]
          const isActive = active === id || (id === 'shield' && shieldActive)
          const disabled =
            !usable || count <= 0 || (id === 'shield' && shieldActive)
          return (
            <button
              key={id}
              type="button"
              onClick={() => activate(id)}
              disabled={disabled && !isActive}
              aria-pressed={isActive}
              title={`${def.name} (tecla ${i + 1}): ${def.description}`}
              aria-label={`${def.name} (${count}), tecla ${i + 1}`}
              aria-keyshortcuts={String(i + 1)}
              className={`relative flex size-11 items-center justify-center rounded-lg text-xl transition ${
                isActive
                  ? 'bg-amber-400/20 ring-2 ring-amber-400'
                  : 'bg-slate-700 hover:bg-slate-600'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span aria-hidden>{def.icon}</span>
              <span className="absolute -right-1 -bottom-1 min-w-5 rounded-full bg-slate-950 px-1 font-mono text-[11px] text-slate-300 tabular-nums">
                {count}
              </span>
            </button>
          )
        })}
        <span className="ml-1 font-mono text-xs text-slate-400 tabular-nums">
          {used}/{MAX_POWER_UPS_PER_GAME}
        </span>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-center text-sm text-slate-300"
      >
        {message}
      </p>
    </div>
  )
}
