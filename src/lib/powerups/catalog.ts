import { POWER_UP_PRICES } from '@/lib/economy/prices'
import type { GameMode } from '@/lib/economy/rewards'
import { POWER_UP_IDS } from './ids'
import type { PowerUpId } from './ids'

/** Tipos de artículo de la tienda; `theme` llega en la Fase 6. */
export type ShopItemKind = 'powerup' | 'theme'

export interface CatalogItem {
  id: string
  item: ShopItemKind
  name: string
  description: string
  icon: string
  price: number
}

export interface PowerUpDef extends CatalogItem {
  id: PowerUpId
  item: 'powerup'
  allowedModes: readonly GameMode[]
}

/** Todos los modos con power-ups (el reto diario no admite ninguno). */
const STANDARD_MODES: readonly GameMode[] = [
  'classic',
  'timeAttack',
  'endless',
  'puzzle',
]

const DEFS: Record<PowerUpId, Omit<PowerUpDef, 'id' | 'item' | 'price'>> = {
  hint: {
    name: 'Pista',
    description: 'Marca una celda deducible y explica por qué.',
    icon: '💡',
    allowedModes: STANDARD_MODES,
  },
  timePlus: {
    name: 'Tiempo+',
    description: 'Suma 15 segundos al reloj.',
    icon: '⏳',
    allowedModes: ['timeAttack'],
  },
  detector: {
    name: 'Detector',
    description: 'Indica si una celda es mina, sin revelarla.',
    icon: '🔍',
    allowedModes: STANDARD_MODES,
  },
  radar: {
    name: 'Radar',
    description: 'Revela un 3×3 sin riesgo: las minas quedan marcadas.',
    icon: '📡',
    allowedModes: STANDARD_MODES,
  },
  shield: {
    name: 'Escudo',
    description: 'Sobrevive a la próxima mina que pises.',
    icon: '🛡️',
    allowedModes: STANDARD_MODES,
  },
}

export const POWER_UPS: Record<PowerUpId, PowerUpDef> = Object.fromEntries(
  POWER_UP_IDS.map((id) => [
    id,
    { id, item: 'powerup', price: POWER_UP_PRICES[id], ...DEFS[id] },
  ]),
) as Record<PowerUpId, PowerUpDef>

/** Artículos a la venta, de más barato a más caro. */
export const SHOP_ITEMS: CatalogItem[] = Object.values(POWER_UPS).sort(
  (a, b) => a.price - b.price,
)

export const isAllowedIn = (id: PowerUpId, mode: GameMode) =>
  POWER_UPS[id].allowedModes.includes(mode)

const MODE_NAMES: Record<GameMode, string> = {
  classic: 'clásico',
  daily: 'reto diario',
  timeAttack: 'contrarreloj',
  endless: 'infinito',
  puzzle: 'puzzle',
}

/** "Todos los modos salvo reto diario" o "Solo contrarreloj". */
export function modesLabel(def: PowerUpDef): string {
  if (def.allowedModes.length === STANDARD_MODES.length) {
    return 'Todos los modos salvo el reto diario'
  }
  return `Solo ${def.allowedModes.map((m) => MODE_NAMES[m]).join(', ')}`
}
