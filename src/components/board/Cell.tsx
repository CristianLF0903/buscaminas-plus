import { memo } from 'react'
import type { Cell as CellData } from '@/lib/engine/types'

interface Props {
  cell: CellData
  playable: boolean
  exploded: boolean
  /** Partida perdida: se marcan las banderas incorrectas. */
  lost: boolean
  /** Resultado del Detector sobre esta celda oculta. */
  detected?: boolean
  /** Resaltado de la Pista. */
  hinted?: 'safe' | 'mine'
}

const HINT_RING: Record<'safe' | 'mine', string> = {
  safe: 'ring-2 ring-emerald-400 animate-pulse',
  mine: 'ring-2 ring-rose-400 animate-pulse',
}

// Clases completas para que Tailwind las detecte
const NUMBER_COLORS: Record<number, string> = {
  1: 'text-sky-400',
  2: 'text-emerald-400',
  3: 'text-rose-400',
  4: 'text-violet-400',
  5: 'text-amber-500',
  6: 'text-cyan-300',
  7: 'text-slate-100',
  8: 'text-slate-400',
}

// Lado de la celda: `--cell`, lo define Board según el viewport
const BASE =
  'flex size-(--cell) items-center justify-center rounded-sm text-sm font-bold leading-none select-none'

function label(cell: CellData, lost: boolean): string {
  if (cell.solid) return 'Bloque'
  if (!cell.revealed) {
    if (cell.flagged)
      return lost && !cell.mineWeight ? 'Bandera incorrecta' : 'Bandera'
    return 'Oculta'
  }
  if (cell.mineWeight) return 'Mina'
  if (cell.fog) return 'Niebla'
  return cell.adjacent ? String(cell.adjacent) : 'Vacía'
}

function Cell({ cell, playable, exploded, lost, detected, hinted }: Props) {
  if (!playable && !cell.solid) {
    // Fuera de la máscara: hueco que conserva la posición en la grilla
    return <div aria-hidden className="size-(--cell)" />
  }

  let className: string
  let content: React.ReactNode = null

  if (cell.solid) {
    className = `${BASE} bg-slate-950 bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgb(255_255_255/0.05)_4px_8px)]`
  } else if (!cell.revealed) {
    className = `${BASE} cursor-pointer bg-slate-600 shadow-[inset_0_-2px_0_rgb(0_0_0/0.25),inset_0_2px_0_rgb(255_255_255/0.08)] hover:bg-slate-500 active:bg-slate-700`
    if (cell.flagged) content = lost && !cell.mineWeight ? '❌' : '🚩'
    else if (detected !== undefined) {
      content = (
        <span className={detected ? 'text-rose-300' : 'text-emerald-300'}>
          {detected ? '!' : '✓'}
        </span>
      )
    }
    if (detected !== undefined) {
      className += detected
        ? ' ring-2 ring-inset ring-rose-500/70'
        : ' ring-2 ring-inset ring-emerald-500/70'
    }
    if (hinted) className += ` ${HINT_RING[hinted]}`
  } else if (cell.mineWeight) {
    className = `${BASE} ${exploded ? 'bg-rose-600' : 'bg-slate-800'}`
    content = (
      <span className="relative">
        💣
        {cell.mineWeight === 2 && (
          <span className="absolute -right-2 -bottom-1 text-[10px] text-amber-300">
            2
          </span>
        )}
      </span>
    )
  } else {
    className = `${BASE} bg-slate-800 ${NUMBER_COLORS[cell.adjacent] ?? 'text-pink-400'}`
    if (cell.fog) content = <span className="text-slate-500">?</span>
    else if (cell.adjacent) content = cell.adjacent
  }

  return (
    <button
      type="button"
      data-id={cell.id}
      aria-label={label(cell, lost)}
      tabIndex={-1}
      className={className}
    >
      {content}
    </button>
  )
}

export default memo(Cell)
