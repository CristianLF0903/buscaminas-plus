import Button from '@/components/ui/Button'
import type { ThemeDef } from '@/lib/themes'

interface Props {
  theme: ThemeDef
  owned: boolean
  active: boolean
  coins: number
  onBuy: () => void
  onUse: () => void
}

/** Tema en la tienda: vista previa, precio y comprar o usar. */
export default function ThemeItem({
  theme,
  owned,
  active,
  coins,
  onBuy,
  onUse,
}: Props) {
  const missing = theme.price - coins
  return (
    <li className="flex flex-col gap-3 rounded-xl bg-slate-800 p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex overflow-hidden rounded-md">
          {theme.swatches.map((color) => (
            <span
              key={color}
              className="h-10 w-5"
              style={{ background: color }}
            />
          ))}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="font-semibold">{theme.name}</h3>
          <p className="text-sm text-slate-400">{theme.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        {owned ? (
          <span className="text-sm text-emerald-400">✓ Tuyo</span>
        ) : (
          <span className="font-mono font-semibold text-amber-300">
            {theme.price} <span aria-hidden>🪙</span>
          </span>
        )}
        <div className="flex items-center gap-2">
          {!owned && missing > 0 && (
            <span className="text-xs text-slate-500">Te faltan {missing}</span>
          )}
          {owned ? (
            <Button onClick={onUse} disabled={active}>
              {active ? 'En uso' : 'Usar'}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={onBuy}
              disabled={missing > 0}
              aria-label={`Comprar tema ${theme.name} por ${theme.price} monedas`}
            >
              Comprar
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
