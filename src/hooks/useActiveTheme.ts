import type { ThemeId } from '@/lib/themes'
import { ownsTheme, usePlayerStore } from '@/store/usePlayerStore'
import { useSettingsStore } from '@/store/useSettingsStore'

/** Tema en uso: uno que ya no es tuyo (p. ej. tras importar) cae al clásico. */
export function useActiveTheme(): ThemeId {
  const theme = useSettingsStore((s) => s.theme)
  const owned = usePlayerStore((s) => ownsTheme(s, theme))
  return owned ? theme : 'classic'
}
