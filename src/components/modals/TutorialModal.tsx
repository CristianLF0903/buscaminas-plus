import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { TUTORIALS } from '@/lib/modes/puzzle'
import type { Mechanic } from '@/lib/puzzle/levels'
import Icon from '@/components/ui/Icon'
import IconText from '@/components/ui/IconText'

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
        <Icon e={icon} />
      </div>
      <p className="text-center text-slate-300">
        <IconText>{body}</IconText>
      </p>
      <Button variant="primary" onClick={onClose} autoFocus>
        ¡Entendido!
      </Button>
    </Modal>
  )
}
