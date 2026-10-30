import { useGameStore } from '@/store/useGameStore'
import Icon from '@/components/ui/Icon'

/** Modo bandera: tocar pone bandera (alternativa al long-press en móvil). */
export default function FlagModeToggle() {
  const flagMode = useGameStore((s) => s.flagMode)
  const setFlagMode = useGameStore((s) => s.setFlagMode)
  return (
    <button
      type="button"
      onClick={() => setFlagMode(!flagMode)}
      aria-pressed={flagMode}
      aria-label="Modo bandera"
      title="Modo bandera: tocar pone bandera"
      className={`flex size-10 items-center justify-center rounded-md text-xl transition ${
        flagMode
          ? 'bg-rose-500/25 ring-2 ring-rose-400'
          : 'bg-slate-700 opacity-70 hover:opacity-100'
      }`}
    >
      <Icon e="🚩" />
    </button>
  )
}
