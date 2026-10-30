import { useEffect, useState } from 'react'

/** Celda a tamaño completo (2rem) y separación de la grilla (`gap-0.5`). */
export const CELL_PX = 32
export const GAP_PX = 2
/** Menor celda antes de aceptar scroll: por debajo ya cuesta tocarla. */
export const MIN_CELL_PX = 18
/** Espacio horizontal alrededor del tablero en móvil (main, panel y grilla). */
export const BOARD_CHROME_PX = 40
/** Igual que en móvil, desde el breakpoint `sm`. */
export const BOARD_CHROME_SM_PX = 64
const SM_PX = 640

export interface BoardLayout {
  /** Filas y columnas intercambiadas (solo visual). */
  transposed: boolean
  /** Lado de la celda en px. */
  cellPx: number
}

/** Ancho de la grilla con `columns` celdas de `cellPx`. */
const gridWidth = (columns: number, cellPx: number) =>
  columns * cellPx + (columns - 1) * GAP_PX

/**
 * Cómo dibujar un tablero de `width`×`height` en un viewport de `viewportPx`
 * de ancho. En portrait, un tablero apaisado que no cabe se gira: así un
 * difícil (30×16) usa 16 columnas. Luego la celda se achica hasta caber,
 * con un mínimo de `MIN_CELL_PX` (si no alcanza, queda scroll).
 */
export function boardLayout(
  width: number,
  height: number,
  viewportPx: number,
  portrait: boolean,
): BoardLayout {
  const chrome = viewportPx < SM_PX ? BOARD_CHROME_PX : BOARD_CHROME_SM_PX
  const available = viewportPx - chrome
  const transposed =
    portrait && width > height && gridWidth(width, CELL_PX) > available
  const columns = transposed ? height : width
  const fit = Math.floor((available + GAP_PX) / columns) - GAP_PX
  const cellPx = Math.max(MIN_CELL_PX, Math.min(CELL_PX, fit))
  return { transposed, cellPx }
}

const PORTRAIT = '(orientation: portrait)'

function readViewport() {
  if (typeof window === 'undefined') return { width: Infinity, portrait: false }
  return {
    // clientWidth descuenta la barra de scroll vertical (innerWidth no)
    width: document.documentElement.clientWidth || window.innerWidth,
    portrait: window.matchMedia?.(PORTRAIT).matches ?? false,
  }
}

/** `boardLayout` para el viewport actual; se recalcula al rotar o redimensionar. */
export function useBoardOrientation(width: number, height: number) {
  const [viewport, setViewport] = useState(readViewport)

  useEffect(() => {
    const update = () =>
      setViewport((prev) => {
        const next = readViewport()
        return next.width === prev.width && next.portrait === prev.portrait
          ? prev
          : next
      })
    // El ancho del primer render puede no ser el final (estilos, scroll)
    update()
    const query = window.matchMedia?.(PORTRAIT)
    // Detecta también cambios de clientWidth que no disparan `resize`
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(document.documentElement)
    window.addEventListener('resize', update)
    query?.addEventListener('change', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
      query?.removeEventListener('change', update)
    }
  }, [])

  return boardLayout(width, height, viewport.width, viewport.portrait)
}
