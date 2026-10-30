import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useLocation } from 'wouter'
import ConfirmModal from '@/components/modals/ConfirmModal'
import { buttonClass } from '@/components/ui/buttonStyles'
import { useLeaveGuard } from '@/store/useLeaveGuard'

/** "← Menú" + logo. Con partida en curso, salir pide confirmación. */
export default function HeaderNav() {
  const guard = useLeaveGuard((s) => s.guard)
  const [, navigate] = useLocation()
  const [confirming, setConfirming] = useState(false)

  const leave = (e: MouseEvent) => {
    if (!guard) return
    e.preventDefault()
    setConfirming(true)
  }

  return (
    <nav className="flex items-center gap-3">
      <Link
        href="/"
        onClick={leave}
        aria-label="Volver al menú principal"
        className={buttonClass('secondary')}
      >
        ← Menú
      </Link>
      <Link
        href="/"
        onClick={leave}
        className="text-lg font-bold tracking-tight hover:text-emerald-300"
      >
        Buscaminas<span className="text-emerald-400">+</span>
      </Link>
      <ConfirmModal
        open={confirming && guard !== null}
        title={guard?.title ?? ''}
        message={guard?.message}
        confirmLabel="Salir"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          navigate('/')
        }}
      />
    </nav>
  )
}
