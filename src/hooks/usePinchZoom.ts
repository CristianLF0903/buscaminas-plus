import { useCallback, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/**
 * Zoom con dos dedos sobre el tablero. El pan con un dedo lo hace el scroll
 * nativo del contenedor (`touch-action: pan-x pan-y`, que además desactiva
 * el zoom del navegador ahí). `pinching()` es true durante el gesto y un
 * instante después, para descartar el clic que llega al soltar.
 */
export function usePinchZoom(maxZoom: number) {
  const [zoom, setZoom] = useState(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{ dist: number; zoom: number } | null>(null)
  const endedAt = useRef(0)

  const distance = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 2) {
        start.current = { dist: distance(), zoom }
      }
    },
    [zoom],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (start.current && pointers.current.size === 2) {
        const ratio = distance() / Math.max(1, start.current.dist)
        setZoom(clamp(start.current.zoom * ratio, 1, maxZoom))
      }
    },
    [maxZoom],
  )

  const onPointerEnd = useCallback((e: PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return
    if (start.current && pointers.current.size < 2) {
      start.current = null
      endedAt.current = performance.now()
    }
  }, [])

  const pinching = useCallback(
    () => start.current !== null || performance.now() - endedAt.current < 300,
    [],
  )

  const step = useCallback(
    (delta: number) => setZoom((z) => clamp(z + delta, 1, maxZoom)),
    [maxZoom],
  )

  return {
    zoom: clamp(zoom, 1, maxZoom),
    step,
    pinching,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  }
}
