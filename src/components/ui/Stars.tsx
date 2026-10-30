import { STAR_LABELS } from '@/lib/modes/puzzle'
import Icon from './Icon'

/** Las tres estrellas de un nivel; las que faltan, apagadas. */
export default function Stars({
  mask,
  size = 'sm',
  highlight = 0,
}: {
  mask: number
  size?: 'sm' | 'lg'
  /** Estrellas recién ganadas: se animan. */
  highlight?: number
}) {
  const got = STAR_LABELS.filter(([bit]) => mask & bit).length
  return (
    <span
      role="img"
      aria-label={`${got} de 3 estrellas`}
      className={`inline-flex ${size === 'lg' ? 'gap-2 text-4xl' : 'gap-px text-xs'}`}
    >
      {STAR_LABELS.map(([bit, label]) => (
        <span
          key={bit}
          title={label}
          aria-hidden
          className={`${mask & bit ? '' : 'opacity-30 grayscale'} ${highlight & bit ? 'animate-bump' : ''}`}
        >
          <Icon e="⭐" />
        </span>
      ))}
    </span>
  )
}
