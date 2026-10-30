/**
 * Imports de cada página: `App` los usa con `lazy` y `Home` los dispara al
 * pasar sobre una tarjeta (prefetch). El navegador cachea el módulo, así que
 * llamarlos varias veces no vuelve a descargar nada.
 */
export const PAGES = {
  home: () => import('./Home'),
  classic: () => import('./play/Classic'),
  daily: () => import('./play/Daily'),
  timeAttack: () => import('./play/TimeAttack'),
  endless: () => import('./play/Endless'),
  shop: () => import('./Shop'),
  comingSoon: () => import('./ComingSoon'),
}

/** Página a pre-cargar según la ruta de una tarjeta del menú. */
export const PREFETCH_BY_PATH: Partial<Record<string, () => Promise<unknown>>> =
  {
    '/play/classic': PAGES.classic,
    '/play/daily': PAGES.daily,
    '/play/time-attack': PAGES.timeAttack,
    '/play/endless': PAGES.endless,
    '/shop': PAGES.shop,
  }
