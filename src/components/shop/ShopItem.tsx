import Button from '@/components/ui/Button'
import { modesLabel } from '@/lib/powerups/catalog'
import type { PowerUpDef } from '@/lib/powerups/catalog'

interface Props {
  def: PowerUpDef
  owned: number
  coins: number
  onBuy: () => void
  /** Cambia en cada compra de este artículo, para reiniciar la animación. */
  bought: number
}

export default function ShopItem({ def, owned, coins, onBuy, bought }: Props) {
  const missing = def.price - coins
  return (
    <li className="flex flex-col gap-3 rounded-xl bg-slate-800 p-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden>
          {def.icon}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="font-semibold">{def.name}</h2>
          <p className="text-sm text-slate-400">{def.description}</p>
          <p className="text-xs text-slate-500">{modesLabel(def)}</p>
        </div>
        <span
          key={bought}
          aria-label={`Tienes ${owned}`}
          className={`rounded-full bg-slate-900 px-2.5 py-0.5 font-mono text-sm text-slate-300 tabular-nums ${bought ? 'animate-bump' : ''}`}
        >
          ×{owned}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono font-semibold text-amber-300">
          {def.price} <span aria-hidden>🪙</span>
        </span>
        <div className="flex items-center gap-2">
          {missing > 0 && (
            <span className="text-xs text-slate-500">Te faltan {missing}</span>
          )}
          <Button
            variant="primary"
            onClick={onBuy}
            disabled={missing > 0}
            aria-label={`Comprar ${def.name} por ${def.price} monedas`}
          >
            Comprar
          </Button>
        </div>
      </div>
    </li>
  )
}
