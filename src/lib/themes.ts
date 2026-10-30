import { THEME_PRICES } from '@/lib/economy/prices'

export type ThemeId = 'classic' | 'minimal' | 'retro' | 'neon'

export interface ThemeDef {
  id: ThemeId
  name: string
  description: string
  /** 0 = gratis. */
  price: number
  /** Fondo, panel, celda y acento, para la vista previa. */
  swatches: [string, string, string, string]
}

/** Los colores reales viven en `styles/index.css` (`[data-theme]`). */
export const THEMES: Record<ThemeId, ThemeDef> = {
  classic: {
    id: 'classic',
    name: 'Clásico',
    description: 'Pizarra oscura con acentos verdes.',
    price: 0,
    swatches: ['#0f172a', '#1e293b', '#475569', '#34d399'],
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Grises neutros, sin distracciones.',
    price: 0,
    swatches: ['#0a0a0a', '#171717', '#525252', '#e5e5e5'],
  },
  retro: {
    id: 'retro',
    name: 'Retro 95',
    description: 'Ventanas grises y contadores de los 90.',
    price: THEME_PRICES.retro,
    swatches: ['#c0c0c0', '#d4d0c8', '#a8a8a8', '#008080'],
  },
  neon: {
    id: 'neon',
    name: 'Neón',
    description: 'Noche violeta con brillo cian y magenta.',
    price: THEME_PRICES.neon,
    swatches: ['#0b0016', '#1a0b2e', '#3b1d63', '#22d3ee'],
  },
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[]

export const isFreeTheme = (id: ThemeId) => THEMES[id].price === 0
