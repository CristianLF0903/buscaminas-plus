import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { stripEmoji } from './emoji'
import IconText from './IconText'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** `<dialog>` nativo: foco atrapado y cierre con Esc sin código extra. */
export default function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  // Al cerrar, el foco vuelve a donde estaba (p. ej. la celda del tablero)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null
      dialog.showModal()
    }
    if (!open && dialog.open) {
      dialog.close()
      returnFocus.current?.focus?.()
      returnFocus.current = null
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={stripEmoji(title)}
      onClose={onClose}
      onClick={(e) => {
        // Clic en el backdrop (fuera del contenido) cierra
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-slate-800 p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-center text-2xl font-bold">
          <IconText>{title}</IconText>
        </h2>
        {children}
      </div>
    </dialog>
  )
}
