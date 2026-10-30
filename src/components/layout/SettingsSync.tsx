import { useEffect } from 'react'
import { useActiveTheme } from '@/hooks/useActiveTheme'
import { useSettingsStore } from '@/store/useSettingsStore'

/**
 * Lleva los ajustes a `<html>`: `data-theme`, `data-motion` y
 * `data-colorblind`, que el CSS usa sin recargar la página.
 */
export default function SettingsSync() {
  const theme = useActiveTheme()
  const animations = useSettingsStore((s) => s.animations)
  const colorblind = useSettingsStore((s) => s.colorblind)

  useEffect(() => {
    const html = document.documentElement
    html.dataset.theme = theme
    if (animations) delete html.dataset.motion
    else html.dataset.motion = 'off'
    if (colorblind) html.dataset.colorblind = ''
    else delete html.dataset.colorblind
  }, [theme, animations, colorblind])

  return null
}
