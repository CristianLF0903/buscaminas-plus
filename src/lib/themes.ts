import { THEME_PRICES } from '@/lib/economy/prices'

export type ThemeId =
  | 'classic'
  | 'minimal'
  | 'retro'
  | 'neon'
  | 'mint'
  | 'forest'
  | 'kawaii'
  | 'kawaiiNight'

export interface ThemeDef {
  id: ThemeId
  name: string
  description: string
  /** 0 = gratis. */
  price: number
  /** Fondo, panel, celda y acento, para la vista previa. */
  swatches: [string, string, string, string]
  /** Emoji de la bandera en el tablero; por defecto 🚩. */
  flagIcon?: string
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
  mint: {
    id: 'mint',
    name: 'Menta',
    description: 'Claro y fresco: verde menta suave sobre blanco.',
    price: THEME_PRICES.mint,
    swatches: ['#e6f7f1', '#f6fffb', '#a7dcc8', '#0b7a5a'],
  },
  forest: {
    id: 'forest',
    name: 'Bosque',
    description: 'Verde musgo profundo con destellos dorados.',
    price: THEME_PRICES.forest,
    swatches: ['#0b1a10', '#132a1b', '#2f5a3c', '#e9c046'],
  },
  kawaii: {
    id: 'kawaii',
    name: 'Kawaii',
    description: 'Rosa pastel con lunares, flores y moños por bandera.',
    price: THEME_PRICES.kawaii,
    swatches: ['#ffe4ef', '#fff5f9', '#f7a8c8', '#c2185b'],
    flagIcon: '🎀',
  },
  kawaiiNight: {
    id: 'kawaiiNight',
    name: 'Kawaii noche',
    description: 'Ciruela oscuro con rosa brillante y estrellitas.',
    price: THEME_PRICES.kawaiiNight,
    swatches: ['#1f0716', '#2e0c22', '#6b2257', '#ff7eb6'],
    flagIcon: '🎀',
  },
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[]

export const isFreeTheme = (id: ThemeId) => THEMES[id].price === 0
