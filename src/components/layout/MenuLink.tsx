import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { useLeaveGuard } from '@/store/useLeaveGuard'

/** Enlace al menú: con partida en curso abre la confirmación en vez de salir. */
export default function MenuLink({
  className,
  children,
  'aria-label': ariaLabel,
}: {
  className?: string
  children: ReactNode
  'aria-label'?: string
}) {
  return (
    <Link
      href="/"
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        if (!useLeaveGuard.getState().guard) return
        e.preventDefault()
        useLeaveGuard.setState({ confirming: true })
      }}
    >
      {children}
    </Link>
  )
}
