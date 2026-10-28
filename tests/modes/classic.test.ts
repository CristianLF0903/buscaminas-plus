import { describe, expect, it } from 'vitest'
import { createEmptyBoard } from '@/lib/engine/generate'
import {
  CLASSIC_PRESETS,
  difficultyOf,
  maxMinesFor,
  validateCustom,
} from '@/lib/modes/classic'

describe('presets clásicos', () => {
  it('generan tableros válidos', () => {
    for (const { config } of Object.values(CLASSIC_PRESETS)) {
      expect(() => createEmptyBoard(config)).not.toThrow()
    }
  })

  it('difficultyOf reconoce presets y custom', () => {
    expect(difficultyOf({ width: 30, height: 16, mines: 99 })).toBe('hard')
    expect(difficultyOf({ width: 30, height: 16, mines: 98 })).toBe('custom')
  })
})

describe('validateCustom', () => {
  it('acepta una config válida', () => {
    const res = validateCustom({ width: 20, height: 10, mines: 30 })
    expect(res).toEqual({
      ok: true,
      config: { width: 20, height: 10, mines: 30 },
    })
  })

  it('rechaza tamaños fuera de rango', () => {
    const res = validateCustom({ width: 4, height: 31, mines: 5 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors).toHaveLength(2)
  })

  it('rechaza minas fuera de rango', () => {
    const max = maxMinesFor(10, 10)
    expect(validateCustom({ width: 10, height: 10, mines: max }).ok).toBe(true)
    expect(validateCustom({ width: 10, height: 10, mines: max + 1 }).ok).toBe(
      false,
    )
    expect(validateCustom({ width: 10, height: 10, mines: 0 }).ok).toBe(false)
  })

  it('rechaza valores no enteros', () => {
    expect(validateCustom({ width: 9.5, height: 9, mines: 10 }).ok).toBe(false)
    expect(validateCustom({ width: 9, height: 9, mines: NaN }).ok).toBe(false)
  })

  it('el máximo permitido genera un tablero sin error', () => {
    const config = { width: 5, height: 5, mines: maxMinesFor(5, 5) }
    expect(validateCustom(config).ok).toBe(true)
    expect(() => createEmptyBoard(config)).not.toThrow()
  })
})
