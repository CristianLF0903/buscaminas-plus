import { describe, expect, it } from 'vitest'
import { POWER_UP_PRICES } from '@/lib/economy/prices'
import {
  isAllowedIn,
  modesLabel,
  POWER_UPS,
  SHOP_ITEMS,
} from '@/lib/powerups/catalog'
import { POWER_UP_IDS } from '@/lib/powerups/ids'

describe('catálogo de power-ups', () => {
  it('precios iniciales', () => {
    expect(POWER_UP_PRICES).toEqual({
      hint: 20,
      timePlus: 25,
      detector: 30,
      radar: 40,
      shield: 80,
    })
  })

  it('todos los power-ups están en la tienda, ordenados por precio', () => {
    expect(SHOP_ITEMS.map((i) => i.id)).toEqual([
      'hint',
      'timePlus',
      'detector',
      'radar',
      'shield',
    ])
    expect(SHOP_ITEMS.every((i) => i.item === 'powerup')).toBe(true)
  })

  it('ninguno se permite en el reto diario', () => {
    for (const id of POWER_UP_IDS) expect(isAllowedIn(id, 'daily')).toBe(false)
  })

  it('Tiempo+ solo en contrarreloj', () => {
    expect(isAllowedIn('timePlus', 'timeAttack')).toBe(true)
    expect(isAllowedIn('timePlus', 'classic')).toBe(false)
    expect(modesLabel(POWER_UPS.timePlus)).toBe('Solo contrarreloj')
  })

  it('el resto se permite en clásico', () => {
    for (const id of ['hint', 'detector', 'radar', 'shield'] as const) {
      expect(isAllowedIn(id, 'classic')).toBe(true)
    }
  })
})
