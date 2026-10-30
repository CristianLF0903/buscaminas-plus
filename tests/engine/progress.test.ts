import { describe, expect, it } from 'vitest'
import { buildExport, exportFileName, parseImport } from '@/lib/progress'

const stored = JSON.stringify({
  state: { coins: 42, inventory: {} },
  version: 2,
})
const NOW = new Date('2026-10-30T12:00:00Z')

describe('exportar / importar progreso', () => {
  it('el export lleva estado, versión y fecha', () => {
    const file = buildExport(stored, NOW)
    expect(file).toEqual({
      app: 'buscaminas-plus',
      exportedAt: NOW.toISOString(),
      player: { state: { coins: 42, inventory: {} }, version: 2 },
    })
    expect(exportFileName(NOW)).toBe('buscaminas-progreso-2026-10-30.json')
  })

  it('sin progreso guardado exporta vacío', () => {
    expect(buildExport(null, NOW).player).toEqual({ state: {}, version: 0 })
  })

  it('ida y vuelta: lo importado es lo exportado', () => {
    const text = JSON.stringify(buildExport(stored, NOW))
    const res = parseImport(text)
    expect(res).toEqual({ ok: true, stored })
  })

  it('rechaza archivos que no son de progreso', () => {
    const bad = [
      'no es json',
      '[]',
      JSON.stringify({ app: 'otra-app', player: { state: {}, version: 1 } }),
      JSON.stringify({ app: 'buscaminas-plus', player: { state: [] } }),
      JSON.stringify({
        app: 'buscaminas-plus',
        player: { state: { coins: 'mucho' }, version: 2 },
      }),
    ]
    for (const text of bad) {
      const res = parseImport(text)
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.error).toMatch(/\./)
    }
  })
})
