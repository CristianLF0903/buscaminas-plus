import type { PowerUpId } from '@/lib/powerups/ids'

/** Regalo de bienvenida: para probar power-ups sin haber ganado monedas. */
export const STARTER_GIFT: {
  coins: number
  powerUps: Partial<Record<PowerUpId, number>>
} = {
  coins: 30,
  powerUps: { hint: 1, radar: 1 },
}
