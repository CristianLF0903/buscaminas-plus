import { useCallback, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import { useLongPress } from '@/hooks/useLongPress'
import { isPlayable } from '@/lib/engine/graph'
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
  const reveal = useGameStore((s) => s.reveal)
  const toggleFlag = useGameStore((s) => s.toggleFlag)
  const chord = useGameStore((s) => s.chord)
  const pointerType = useRef('mouse')

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
    const cell = useGameStore.getState().board.cells[id]
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
        className="grid w-max touch-manipulation gap-0.5 bg-slate-900 p-1 [-webkit-touch-callout:none]"
        style={{ gridTemplateColumns: `repeat(${board.width}, 2rem)` }}
        {...handlers}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        {board.cells.map((cell) => (
          <Cell
            key={cell.id}
            cell={cell}
            playable={isPlayable(board, cell.id)}
            exploded={cell.id === explodedId}
            lost={lost}
          />
        ))}
      </div>
    </div>
  )
}
