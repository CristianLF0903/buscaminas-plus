import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  resetSettings,
  useSettingsStore,
} from '@/store/useSettingsStore'

const state = () => useSettingsStore.getState()

describe('useSettingsStore', () => {
  beforeEach(() => {
    resetSettings()
    localStorage.clear()
  })

  it('valores por defecto', () => {
    expect(state()).toMatchObject(DEFAULT_SETTINGS)
  })

  it('update cambia y persiste solo los datos', async () => {
    state().update({ theme: 'minimal', volume: 0.2, colorblind: true })
    const saved = JSON.parse(localStorage.getItem('buscaminas-settings')!)
    expect(saved.state).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'minimal',
      volume: 0.2,
      colorblind: true,
    })
    expect(saved.state.update).toBeUndefined()

    // "Recarga": memoria limpia y rehidratación desde storage
    useSettingsStore.setState({ theme: 'classic' })
    localStorage.setItem('buscaminas-settings', JSON.stringify(saved))
    await useSettingsStore.persist.rehydrate()
    expect(state().theme).toBe('minimal')
  })
})
