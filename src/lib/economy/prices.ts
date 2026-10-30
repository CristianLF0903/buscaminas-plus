import type { PowerUpId } from '@/lib/powerups/ids'

/** Precios en monedas. Centralizados para balancear. */
export const POWER_UP_PRICES: Record<PowerUpId, number> = {
  hint: 20,
  timePlus: 25,
  detector: 30,
  radar: 40,
  shield: 80,
}

/** Temas de pago; los que no figuran son gratis. */
export const THEME_PRICES = {
  retro: 150,
  neon: 250,
} as const
