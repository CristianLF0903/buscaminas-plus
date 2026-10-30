import { useLocation } from 'wouter'
import ConfirmModal from '@/components/modals/ConfirmModal'
import { useLeaveGuard } from '@/store/useLeaveGuard'

/** Confirmación de "salir al menú", compartida por todos los `MenuLink`. */
export default function LeaveConfirmModal() {
  const guard = useLeaveGuard((s) => s.guard)
  const confirming = useLeaveGuard((s) => s.confirming)
  const [, navigate] = useLocation()
  const close = () => useLeaveGuard.setState({ confirming: false })

  return (
    <ConfirmModal
      open={confirming && guard !== null}
      title={guard?.title ?? ''}
      message={guard?.message}
      confirmLabel="Salir"
      onCancel={close}
      onConfirm={() => {
        close()
        navigate('/')
      }}
    />
  )
}
