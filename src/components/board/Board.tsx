import { useCallback, useMemo, useRef } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { useBoardOrientation } from '@/hooks/useBoardOrientation'
import { useLongPress } from '@/hooks/useLongPress'
import { index, isPlayable } from '@/lib/engine/graph'
import { useGameStore } from '@/store/useGameStore'
import Cell from './Cell'

/** Id de la celda bajo el evento (delegación: un solo set de handlers). */
function cellId(target: EventTarget | null): number | null {
  const el = (target as HTMLElement | null)?.closest?.('[data-id]')
  return el ? Number((el as HTMLElement).dataset.id) : null
}

export default function Board() {
  const board = useGameStore((s) => s.board)
  const status = useGameStore((s) => s.status)
  const explodedId = useGameStore((s) => s.explodedId)
  const activePowerUp = useGameStore((s) => s.activePowerUp)
  const detected = useGameStore((s) => s.detected)
  const hint = useGameStore((s) => s.hint)
  const reveal = useGameStore((s) => s.reveal)
  const toggleFlag = useGameStore((s) => s.toggleFlag)
  const chord = useGameStore((s) => s.chord)
  const pointerType = useRef('mouse')
  const { transposed, cellPx } = useBoardOrientation(board.width, board.height)

  // Transpuesto, la fila visual r es la columna x = r del tablero. Solo cambia
  // el orden de dibujo: ids, motor y store siguen igual.
  const cells = useMemo(() => {
    if (!transposed) return board.cells
    const { width, height } = board
    const out = []
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) out.push(board.cells[index(x, y, width)])
    }
    return out
  }, [transposed, board])
  const columns = transposed ? board.height : board.width

  const { handlers, consumeLongPress } = useLongPress(
    useCallback(
      (target: EventTarget) => {
        const id = cellId(target)
        if (id === null) return
        toggleFlag(id)
        navigator.vibrate?.(30)
      },
      [toggleFlag],
    ),
  )

  const onPointerDown = (e: PointerEvent) => {
    pointerType.current = e.pointerType
    handlers.onPointerDown(e)
  }

  const onClick = (e: MouseEvent) => {
    if (consumeLongPress()) return
    const id = cellId(e.target)
    if (id === null) return
    const state = useGameStore.getState()
    // Power-up esperando celda: el clic lo aplica en vez de revelar
    if (state.activePowerUp) {
      state.targetCell(id)
      return
    }
    const cell = state.board.cells[id]
    if (cell.revealed) chord(id)
    else reveal(id)
  }

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    // En touch la bandera la pone el long-press; Android además lanza contextmenu
    if (pointerType.current !== 'mouse') return
    const id = cellId(e.target)
    if (id !== null) toggleFlag(id)
  }

  const lost = status === 'lost'

  return (
    <div className="max-w-full overflow-auto rounded-lg [scrollbar-color:var(--color-slate-600)_transparent]">
      <div
        role="grid"
        aria-label="Tablero"
        className={`grid w-max touch-manipulation gap-0.5 bg-slate-900 p-1 [-webkit-touch-callout:none] ${activePowerUp ? 'cursor-crosshair outline-2 outline-amber-400 [&_button]:cursor-crosshair' : ''}`}
        data-transposed={transposed || undefined}
        style={
          {
            '--cell': `${cellPx}px`,
            gridTemplateColumns: `repeat(${columns}, var(--cell))`,
          } as CSSProperties
        }
        {...handlers}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        {cells.map((cell) => (
          <Cell
            key={cell.id}
            cell={cell}
            playable={isPlayable(board, cell.id)}
            exploded={cell.id === explodedId}
            lost={lost}
            detected={detected[cell.id]}
            hinted={hint?.id === cell.id ? hint.kind : undefined}
          />
        ))}
      </div>
    </div>
  )
}
