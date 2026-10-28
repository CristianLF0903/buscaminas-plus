import type { BoardConfig } from '@/lib/engine/types'

export type ClassicPreset = 'easy' | 'medium' | 'hard'
export type ClassicDifficulty = ClassicPreset | 'custom'

export const CLASSIC_PRESETS: Record<
  ClassicPreset,
  { label: string; config: BoardConfig }
> = {
  easy: { label: 'Fácil', config: { width: 9, height: 9, mines: 10 } },
  medium: { label: 'Medio', config: { width: 16, height: 16, mines: 40 } },
  hard: { label: 'Difícil', config: { width: 30, height: 16, mines: 99 } },
}

export const CUSTOM_LIMITS = {
  minWidth: 5,
  maxWidth: 40,
  minHeight: 5,
  maxHeight: 30,
  minMines: 1,
} as const

/** Máximo de minas: el primer clic libera la celda y sus 8 vecinos. */
export const maxMinesFor = (width: number, height: number) => width * height - 9

export type CustomValidation =
  { ok: true; config: BoardConfig } | { ok: false; errors: string[] }

export function validateCustom(input: {
  width: number
  height: number
  mines: number
}): CustomValidation {
  const { width, height, mines } = input
  const L = CUSTOM_LIMITS
  const errors: string[] = []
  const isInt = (n: number) => Number.isInteger(n)

  if (!isInt(width) || width < L.minWidth || width > L.maxWidth) {
    errors.push(`El ancho debe estar entre ${L.minWidth} y ${L.maxWidth}.`)
  }
  if (!isInt(height) || height < L.minHeight || height > L.maxHeight) {
    errors.push(`El alto debe estar entre ${L.minHeight} y ${L.maxHeight}.`)
  }
  if (errors.length === 0) {
    const max = maxMinesFor(width, height)
    if (!isInt(mines) || mines < L.minMines || mines > max) {
      errors.push(`Las minas deben estar entre ${L.minMines} y ${max}.`)
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, config: input }
}

/** Dificultad que corresponde a una config (custom si no es un preset). */
export function difficultyOf(config: BoardConfig): ClassicDifficulty {
  const match = (Object.keys(CLASSIC_PRESETS) as ClassicPreset[]).find(
    (key) => {
      const p = CLASSIC_PRESETS[key].config
      return (
        p.width === config.width &&
        p.height === config.height &&
        p.mines === config.mines
      )
    },
  )
  return match ?? 'custom'
}
