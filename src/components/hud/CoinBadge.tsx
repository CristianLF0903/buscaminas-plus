import { usePlayerStore } from '@/store/usePlayerStore'
import Icon from '@/components/ui/Icon'

export default function CoinBadge() {
  const coins = usePlayerStore((s) => s.coins)
  return (
    <div
      aria-label={`${coins} monedas`}
      className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 font-mono text-sm font-semibold text-amber-300 tabular-nums"
    >
      <Icon e="🪙" />
      {coins}
    </div>
  )
}
