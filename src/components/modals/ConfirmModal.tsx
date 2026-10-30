import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

/** Confirmación de una acción que descarta la partida en curso. */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {message && <p className="text-center text-slate-300">{message}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onCancel} autoFocus>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
