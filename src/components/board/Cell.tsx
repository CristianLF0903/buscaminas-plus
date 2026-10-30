import { memo } from 'react'
import type { CSSProperties } from 'react'
import Icon from '@/components/ui/Icon'
import type { Cell as CellData } from '@/lib/engine/types'

interface Props {
  cell: CellData
  playable: boolean
  exploded: boolean
  /** Partida perdida: se marcan las banderas incorrectas. */
  lost: boolean
  /** Partida ganada: las minas sin bandera se muestran con la onda final. */
  won?: boolean
  /** Emoji de la bandera según el tema (🚩, o 🎀 en los kawaii). */
  flagIcon?: string
  /** Resultado del Detector sobre esta celda oculta. */
  detected?: boolean
  /** Resaltado de la Pista. */
  hinted?: 'safe' | 'mine'
  /** Celda con el foco del teclado (roving tabindex). */
  focused?: boolean
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
  'relative flex size-(--cell) items-center justify-center rounded-sm text-sm font-bold leading-none select-none'

/** Icono que escala con la celda (no con el texto). */
const CELL_ICON = 'size-[68%]'

/** "2" sobre banderas y minas dobles. */
const double = (
  <span className="absolute right-px bottom-px text-[10px] leading-none text-amber-300">
    2
  </span>
)

function state(
  cell: CellData,
  lost: boolean,
  won: boolean,
  detected?: boolean,
): string {
  if (cell.solid) return 'bloque'
  if (!cell.revealed) {
    if (cell.flagged) {
      if (lost && !cell.mineWeight) return 'bandera incorrecta'
      return cell.doubleFlag ? 'bandera doble' : 'bandera'
    }
    if (won && cell.mineWeight)
      return cell.mineWeight === 2 ? 'mina doble' : 'mina'
    if (detected !== undefined) {
      return detected ? 'oculta, el detector dice mina' : 'oculta, segura'
    }
    return 'oculta'
  }
  if (cell.mineWeight) return cell.mineWeight === 2 ? 'mina doble' : 'mina'
  if (cell.fog) return 'niebla, número oculto'
  if (!cell.adjacent) return 'vacía'
  return cell.adjacent === 1 ? '1 mina cerca' : `${cell.adjacent} minas cerca`
}

/** "Fila 3, columna 5: 2 minas cerca". */
const label = (
  cell: CellData,
  lost: boolean,
  won: boolean,
  detected?: boolean,
) =>
  `Fila ${cell.y + 1}, columna ${cell.x + 1}: ${state(cell, lost, won, detected)}`

function Cell({
  cell,
  playable,
  exploded,
  lost,
  won = false,
  flagIcon = '🚩',
  detected,
  hinted,
  focused = false,
}: Props) {
  if (!playable && !cell.solid) {
    // Fuera de la máscara: hueco que conserva la posición en la grilla
    return <div aria-hidden className="size-(--cell) rounded-sm bg-slate-950" />
  }

  let className: string
  let content: React.ReactNode = null

  if (cell.solid) {
    className = `${BASE} bg-slate-950 bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgb(255_255_255/0.05)_4px_8px)]`
  } else if (!cell.revealed) {
    className = `${BASE} cursor-pointer bg-slate-600 shadow-[inset_0_-2px_0_rgb(0_0_0/0.25),inset_0_2px_0_rgb(255_255_255/0.08)] hover:bg-slate-500 active:bg-slate-700`
    if (cell.flagged) {
      content =
        lost && !cell.mineWeight ? (
          <Icon e="❌" className={CELL_ICON} />
        ) : (
          <>
            <Icon e={flagIcon} className={CELL_ICON} />
            {cell.doubleFlag && double}
          </>
        )
    } else if (won && cell.mineWeight) {
      // Victoria: la onda final muestra dónde estaban
      className += ' cell-mine-show'
      content = (
        <>
          <Icon e="💣" className={CELL_ICON} />
          {cell.mineWeight === 2 && double}
        </>
      )
    } else if (detected !== undefined) {
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
    // Explosión en cadena desde la mina pisada
    className = `${BASE} cell-explode ${exploded ? 'bg-rose-600' : 'bg-slate-800'}`
    // La pisada estalla; el resto queda como bomba
    content = (
      <>
        <Icon e={exploded ? '💥' : '💣'} className={CELL_ICON} />
        {cell.mineWeight === 2 && double}
      </>
    )
  } else {
    className = `${BASE} cell-reveal bg-slate-800 ${NUMBER_COLORS[cell.adjacent] ?? 'text-pink-400'}`
    if (cell.fog) content = <span className="text-slate-500">?</span>
    else if (cell.adjacent) content = cell.adjacent
    // Pista fija: revelada desde el inicio
    if (cell.hint) className += ' ring-1 ring-inset ring-sky-400/50'
  }

  // Posición para el retraso de las animaciones (ver index.css)
  const style = { '--x': cell.x, '--y': cell.y } as CSSProperties

  return (
    <button
      type="button"
      role="gridcell"
      data-id={cell.id}
      data-n={cell.revealed && !cell.fog ? cell.adjacent : undefined}
      data-hint={hinted}
      aria-label={label(cell, lost, won, detected)}
      tabIndex={focused ? 0 : -1}
      className={`${className} focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300`}
      style={style}
    >
      {content}
    </button>
  )
}

export default memo(Cell)
