import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { TUTORIALS } from '@/lib/modes/puzzle'
import type { Mechanic } from '@/lib/puzzle/levels'

/** Explicación corta de la mecánica que presenta un nivel. */
export default function TutorialModal({
  mechanic,
  open,
  onClose,
}: {
  mechanic: Mechanic
  open: boolean
  onClose: () => void
}) {
  const { icon, title, body } = TUTORIALS[mechanic]
  return (
    <Modal open={open} onClose={onClose} title={`Nuevo: ${title}`}>
      <div className="text-center text-5xl" aria-hidden>
        {icon}
      </div>
      <p className="text-center text-slate-300">{body}</p>
      <Button variant="primary" onClick={onClose} autoFocus>
        ¡Entendido!
      </Button>
    </Modal>
  )
}
