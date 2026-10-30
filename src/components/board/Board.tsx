import { useCallback, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from 'react'
import { CELL_PX, useBoardOrientation } from '@/hooks/useBoardOrientation'
import { useLongPress } from '@/hooks/useLongPress'
import { useActiveTheme } from '@/hooks/useActiveTheme'
import { usePinchZoom } from '@/hooks/usePinchZoom'
import { endRevealTiming } from '@/lib/endReveal'
import { coords, index, isPlayable } from '@/lib/engine/graph'
import type { Board as BoardData } from '@/lib/engine/types'
import { THEMES } from '@/lib/themes'
import { useGameStore } from '@/store/useGameStore'
import Cell from './Cell'

/** Celda más grande a la que llega el zoom. */
const MAX_ZOOM_CELL_PX = 44

/** Id de la celda bajo el evento (delegación: un solo set de handlers). */
function cellId(target: EventTarget | null): number | null {
  const el = (target as HTMLElement | null)?.closest?.('[data-id]')
  return el ? Number((el as HTMLElement).dataset.id) : null
}

const ARROWS: Record<string, [dr: number, dc: number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/**
 * Siguiente celda jugable en una dirección visual, saltando huecos y
 * bloques. Transpuesto, la fila visual es la x del tablero.
 */
function step(
  board: BoardData,
  id: number,
  [dr, dc]: [number, number],
  transposed: boolean,
): number {
  const { x, y } = coords(id, board.width)
  let r = transposed ? x : y
  let c = transposed ? y : x
  const rows = transposed ? board.width : board.height
  const cols = transposed ? board.height : board.width
  for (;;) {
    r += dr
    c += dc
    if (r < 0 || c < 0 || r >= rows || c >= cols) return id
    const next = transposed
      ? index(r, c, board.width)
      : index(c, r, board.width)
    if (isPlayable(board, next)) return next
  }
}

/** Primera celda jugable: donde empieza el foco del teclado. */
const firstPlayable = (board: BoardData) =>
  board.cells.find((c) => isPlayable(board, c.id))?.id ?? 0

export default function Board({ allowReset = true }: { allowReset?: boolean }) {
  const board = useGameStore((s) => s.board)
  const status = useGameStore((s) => s.status)
  const explodedId = useGameStore((s) => s.explodedId)
  const origin = useGameStore((s) => s.origin)
  const activePowerUp = useGameStore((s) => s.activePowerUp)
  const flagMode = useGameStore((s) => s.flagMode)
  const detected = useGameStore((s) => s.detected)
  const hint = useGameStore((s) => s.hint)
  const reveal = useGameStore((s) => s.reveal)
  const toggleFlag = useGameStore((s) => s.toggleFlag)
  const chord = useGameStore((s) => s.chord)
  const reset = useGameStore((s) => s.reset)
  const flagIcon = THEMES[useActiveTheme()].flagIcon
  const pointerType = useRef('mouse')
  const gridRef = useRef<HTMLDivElement>(null)
  const [focusId, setFocusId] = useState<number | null>(null)
  const { transposed, cellPx } = useBoardOrientation(board.width, board.height)
  const pinch = usePinchZoom(Math.max(1, MAX_ZOOM_CELL_PX / cellPx))
  const size = Math.round(cellPx * pinch.zoom)
  const zoomable = cellPx < CELL_PX || pinch.zoom > 1

  // Transpuesto, la fila visual r es la columna x = r del tablero. Solo cambia
  // el orden de dibujo: ids, motor y store siguen igual.
  const rows = useMemo(() => {
    const { width, height, cells } = board
    const out: (typeof cells)[] = []
    if (transposed) {
      for (let x = 0; x < width; x++) {
        const row = []
        for (let y = 0; y < height; y++) row.push(cells[index(x, y, width)])
        out.push(row)
      }
    } else {
      for (let y = 0; y < height; y++) {
        out.push(cells.slice(y * width, (y + 1) * width))
      }
    }
    return out
  }, [transposed, board])
  const columns = transposed ? board.height : board.width

  // El foco guardado puede quedar fuera al cambiar de tablero
  const focused =
    focusId !== null && board.cells[focusId] && isPlayable(board, focusId)
      ? focusId
      : firstPlayable(board)

  /** Clic o toque: revela, o pone bandera en modo bandera. */
  const act = useCallback(
    (id: number, flag: boolean) => {
      const state = useGameStore.getState()
      // Power-up esperando celda: el clic lo aplica en vez de revelar
      if (state.activePowerUp) {
        state.targetCell(id)
        return
      }
      const cell = state.board.cells[id]
      if (cell.revealed) chord(id)
      else if (flag) toggleFlag(id)
      else reveal(id)
    },
    [chord, reveal, toggleFlag],
  )

  const longPress = useLongPress(
    useCallback(
      (target: EventTarget) => {
        const id = cellId(target)
        if (id === null) return
        // En modo bandera el long-press revela: los gestos se intercambian
        if (useGameStore.getState().flagMode) act(id, false)
        else toggleFlag(id)
      },
      [act, toggleFlag],
    ),
  )

  const onPointerDown = (e: PointerEvent) => {
    pointerType.current = e.pointerType
    pinch.handlers.onPointerDown(e)
    // Segundo dedo: es un pellizco, no un long-press
    if (pinch.pinching()) longPress.handlers.onPointerCancel()
    else longPress.handlers.onPointerDown(e)
  }

  const onClick = (e: MouseEvent) => {
    if (longPress.consumeLongPress() || pinch.pinching()) return
    const id = cellId(e.target)
    if (id === null) return
    setFocusId(id)
    act(id, flagMode)
  }

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    // En touch la bandera la pone el long-press; Android además lanza contextmenu
    if (pointerType.current !== 'mouse') return
    const id = cellId(e.target)
    if (id !== null) toggleFlag(id)
  }

  const focusCell = (id: number) => {
    setFocusId(id)
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-id="${id}"]`)
      ?.focus({ preventScroll: false })
  }

  /** Flechas mueven el foco; F bandera, D chord, R reiniciar. */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const id = cellId(e.target) ?? focused
    const arrow = ARROWS[e.key]
    if (arrow) {
      e.preventDefault()
      focusCell(step(board, id, arrow, transposed))
      return
    }
    switch (e.key.toLowerCase()) {
      case 'f':
        e.preventDefault()
        toggleFlag(id)
        break
      case 'd':
        e.preventDefault()
        chord(id)
        break
      case 'r':
        if (!allowReset) return
        e.preventDefault()
        reset()
        break
    }
  }

  const lost = status === 'lost'
  const won = status === 'won'
  const at = (id: number | null) =>
    id === null ? { x: 0, y: 0 } : coords(id, board.width)
  const o = at(origin)
  // Centro de la onda final: la mina pisada o, al ganar, la última jugada
  const center = lost ? explodedId : origin
  const ex = at(center)
  const mineStep = lost || won ? endRevealTiming(board, center).stepMs : 0

  return (
    <div className="flex max-w-full flex-col items-center gap-1">
      {zoomable && (
        <div className="flex items-center gap-1 self-end text-xs text-slate-400">
          <span className="sr-only">Zoom del tablero</span>
          <button
            type="button"
            onClick={() => pinch.step(-0.25)}
            disabled={pinch.zoom <= 1}
            aria-label="Alejar"
            className="size-7 rounded bg-slate-700 text-base disabled:opacity-40"
          >
            −
          </button>
          <span className="w-10 text-center font-mono tabular-nums">
            {Math.round(pinch.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => pinch.step(0.25)}
            disabled={size >= MAX_ZOOM_CELL_PX}
            aria-label="Acercar"
            className="size-7 rounded bg-slate-700 text-base disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}
      <div
        // Con zoom el tablero se recorre con scroll (pan) dentro del marco
        className={`max-w-full touch-pan-x touch-pan-y overflow-auto overscroll-contain rounded-lg [scrollbar-color:var(--color-slate-600)_transparent] ${pinch.zoom > 1 ? 'max-h-[70vh]' : ''}`}
      >
        <div
          ref={gridRef}
          role="grid"
          aria-label={`Tablero de ${board.width} por ${board.height}`}
          aria-describedby="board-keys"
          className={`grid w-max gap-0.5 bg-slate-900 p-1 select-none [-webkit-touch-callout:none] ${activePowerUp ? 'cursor-crosshair outline-2 outline-amber-400 [&_button]:cursor-crosshair' : ''} ${flagMode && !activePowerUp ? 'outline-2 outline-rose-400/70' : ''}`}
          data-transposed={transposed || undefined}
          style={
            {
              '--cell': `${size}px`,
              '--ox': o.x,
              '--oy': o.y,
              '--ex': ex.x,
              '--ey': ex.y,
              '--mine-step': `${mineStep}ms`,
              gridTemplateColumns: `repeat(${columns}, var(--cell))`,
            } as CSSProperties
          }
          onPointerDown={onPointerDown}
          onPointerMove={(e) => {
            pinch.handlers.onPointerMove(e)
            longPress.handlers.onPointerMove(e)
          }}
          onPointerUp={(e) => {
            pinch.handlers.onPointerUp(e)
            longPress.handlers.onPointerUp()
          }}
          onPointerCancel={(e) => {
            pinch.handlers.onPointerCancel(e)
            longPress.handlers.onPointerCancel()
          }}
          onPointerLeave={longPress.handlers.onPointerLeave}
          onClick={onClick}
          onContextMenu={onContextMenu}
          onKeyDown={onKeyDown}
        >
          {rows.map((row, r) => (
            // Filas sin caja propia: la grilla CSS sigue siendo una sola
            <div key={r} role="row" className="contents">
              {row.map((cell) => (
                <Cell
                  key={cell.id}
                  cell={cell}
                  playable={isPlayable(board, cell.id)}
                  exploded={cell.id === explodedId}
                  lost={lost}
                  won={won}
                  flagIcon={flagIcon}
                  detected={detected[cell.id]}
                  hinted={hint?.id === cell.id ? hint.kind : undefined}
                  focused={cell.id === focused}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p id="board-keys" className="sr-only">
        Flechas para moverte, Enter o Espacio para revelar, F para bandera, D
        para abrir alrededor de un número
        {allowReset ? ', R para reiniciar' : ''}. Números 1 a 5 usan power-ups.
      </p>
    </div>
  )
}
