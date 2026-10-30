import { useEffect } from 'react'
import { ownsTheme, usePlayerStore } from '@/store/usePlayerStore'
import { useSettingsStore } from '@/store/useSettingsStore'

/**
 * Lleva los ajustes a `<html>`: `data-theme`, `data-motion` y
 * `data-colorblind`, que el CSS usa sin recargar la página.
 */
export default function SettingsSync() {
  const theme = useSettingsStore((s) => s.theme)
  const animations = useSettingsStore((s) => s.animations)
  const colorblind = useSettingsStore((s) => s.colorblind)
  // Un tema que ya no es tuyo (p. ej. tras importar progreso) cae al clásico
  const owned = usePlayerStore((s) => ownsTheme(s, theme))

  useEffect(() => {
    const html = document.documentElement
    html.dataset.theme = owned ? theme : 'classic'
    if (animations) delete html.dataset.motion
    else html.dataset.motion = 'off'
    if (colorblind) html.dataset.colorblind = ''
    else delete html.dataset.colorblind
  }, [theme, owned, animations, colorblind])

  return null
}
