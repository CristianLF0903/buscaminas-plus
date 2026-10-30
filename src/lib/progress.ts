/** Clave de `usePlayerStore` en localStorage. */
export const PLAYER_STORAGE_KEY = 'buscaminas-player'

const APP = 'buscaminas-plus'

/** Archivo de progreso exportado. */
export interface ProgressFile {
  app: typeof APP
  exportedAt: string
  /** Lo que `persist` guarda: estado y versión del esquema. */
  player: { state: Record<string, unknown>; version: number }
}

/** Arma el archivo a partir de lo guardado en localStorage. */
export function buildExport(
  stored: string | null,
  now: Date = new Date(),
): ProgressFile {
  const parsed = stored ? JSON.parse(stored) : null
  return {
    app: APP,
    exportedAt: now.toISOString(),
    player: {
      state: parsed?.state ?? {},
      version: parsed?.version ?? 0,
    },
  }
}

export const exportFileName = (now: Date = new Date()) =>
  `buscaminas-progreso-${now.toISOString().slice(0, 10)}.json`

export type ImportResult =
  { ok: true; stored: string } | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Valida un archivo exportado y devuelve el texto para localStorage. La
 * migración de versiones la hace `persist` al rehidratar.
 */
export function parseImport(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }
  if (!isObject(data) || data.app !== APP || !isObject(data.player)) {
    return { ok: false, error: 'No es un archivo de progreso de Buscaminas+.' }
  }
  const { state, version } = data.player
  if (!isObject(state) || typeof version !== 'number') {
    return { ok: false, error: 'El archivo de progreso está incompleto.' }
  }
  if (state.coins !== undefined && typeof state.coins !== 'number') {
    return { ok: false, error: 'El archivo de progreso está dañado.' }
  }
  return { ok: true, stored: JSON.stringify({ state, version }) }
}
