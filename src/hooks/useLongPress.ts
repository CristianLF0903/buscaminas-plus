import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'

interface Options {
  delay?: number
  /** Píxeles que se puede mover el dedo antes de cancelar. */
  moveTolerance?: number
}

/**
 * Long-press para touch/pen (el mouse usa clic derecho). `consumeLongPress`
 * devuelve true una sola vez tras disparar, para descartar el `click` que
 * llega al soltar.
 */
export function useLongPress(
  onLongPress: (target: EventTarget) => void,
  { delay = 400, moveTolerance = 10 }: Options = {},
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef({ x: 0, y: 0 })
  const fired = useRef(false)
  const callback = useRef(onLongPress)

  useEffect(() => {
    callback.current = onLongPress
  }, [onLongPress])

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      fired.current = false
      if (e.pointerType === 'mouse') return
      cancel()
      const target = e.target
      origin.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(() => {
        fired.current = true
        timer.current = null
        callback.current(target)
      }, delay)
    },
    [cancel, delay],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!timer.current) return
      const dx = e.clientX - origin.current.x
      const dy = e.clientY - origin.current.y
      if (Math.hypot(dx, dy) > moveTolerance) cancel()
    },
    [cancel, moveTolerance],
  )

  const consumeLongPress = useCallback(() => {
    const was = fired.current
    fired.current = false
    return was
  }, [])

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
    },
    consumeLongPress,
  }
}
