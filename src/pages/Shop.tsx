import { useRef, useState } from 'react'
import ShopItem from '@/components/shop/ShopItem'
import ThemeItem from '@/components/shop/ThemeItem'
import { POWER_UPS, SHOP_ITEMS } from '@/lib/powerups/catalog'
import type { PowerUpId } from '@/lib/powerups/ids'
import { THEME_IDS, THEMES } from '@/lib/themes'
import type { ThemeId } from '@/lib/themes'
import { ownsTheme, usePlayerStore } from '@/store/usePlayerStore'
import { useSettingsStore } from '@/store/useSettingsStore'

const PAID_THEMES = THEME_IDS.filter((id) => THEMES[id].price > 0)

const TOAST_MS = 1800

export default function Shop() {
  const coins = usePlayerStore((s) => s.coins)
  const inventory = usePlayerStore((s) => s.inventory)
  const buyPowerUp = usePlayerStore((s) => s.buyPowerUp)
  const buyTheme = usePlayerStore((s) => s.buyTheme)
  const ownedThemes = usePlayerStore((s) => s.ownedThemes)
  const activeTheme = useSettingsStore((s) => s.theme)
  const updateSettings = useSettingsStore((s) => s.update)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [bought, setBought] = useState<Partial<Record<PowerUpId, number>>>({})
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const toastCount = useRef(0)

  const showToast = (text: string) => {
    setToast({ id: ++toastCount.current, text })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }

  const buy = (id: PowerUpId) => {
    if (!buyPowerUp(id)) return
    const def = POWER_UPS[id]
    setBought((b) => ({ ...b, [id]: (b[id] ?? 0) + 1 }))
    showToast(`${def.icon} ${def.name} comprado`)
  }

  const buyAndUse = (id: ThemeId) => {
    if (!buyTheme(id)) return
    updateSettings({ theme: id })
    showToast(`🎨 Tema ${THEMES[id].name} activado`)
  }

  return (
    <section className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Tienda</h1>
          <p className="text-sm text-slate-400">
            Hasta 3 power-ups por partida. Gana monedas jugando.
          </p>
        </div>
        <p className="font-mono text-lg font-semibold text-amber-300">
          {coins} <span aria-hidden>🪙</span>
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SHOP_ITEMS.map((item) => {
          if (item.item !== 'powerup') return null
          const id = item.id as PowerUpId
          return (
            <ShopItem
              key={id}
              def={POWER_UPS[id]}
              owned={inventory[id]}
              coins={coins}
              bought={bought[id] ?? 0}
              onBuy={() => buy(id)}
            />
          )
        })}
      </ul>

      <h2 className="text-lg font-semibold">Temas</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PAID_THEMES.map((id) => (
          <ThemeItem
            key={id}
            theme={THEMES[id]}
            owned={ownsTheme({ ownedThemes }, id)}
            active={activeTheme === id}
            coins={coins}
            onBuy={() => buyAndUse(id)}
            onUse={() => updateSettings({ theme: id })}
          />
        ))}
      </ul>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4"
      >
        {toast && (
          <span
            key={toast.id}
            className="animate-toast-in rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg"
          >
            {toast.text}
          </span>
        )}
      </div>
    </section>
  )
}
