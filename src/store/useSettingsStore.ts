import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ThemeId } from '@/lib/themes'

export interface Settings {
  theme: ThemeId
  sound: boolean
  /** 0–1. */
  volume: number
  vibration: boolean
  showTimer: boolean
  /** false fuerza animaciones mínimas (además de prefers-reduced-motion). */
  animations: boolean
  /** Paleta de números apta para daltonismo y marcas con forma. */
  colorblind: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'classic',
  sound: true,
  volume: 0.6,
  vibration: true,
  showTimer: true,
  animations: true,
  colorblind: false,
}

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
    }),
    {
      name: 'buscaminas-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Solo los datos: `update` es una función
      partialize: (s): Settings => ({
        theme: s.theme,
        sound: s.sound,
        volume: s.volume,
        vibration: s.vibration,
        showTimer: s.showTimer,
        animations: s.animations,
        colorblind: s.colorblind,
      }),
    },
  ),
)

/** Vuelve a los valores por defecto (tests). */
export const resetSettings = () => useSettingsStore.setState(DEFAULT_SETTINGS)
