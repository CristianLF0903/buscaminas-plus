import { Fragment } from 'react'
import { EMOJI, iconKey } from './emoji'
import Icon from './Icon'
import { ICONS } from './icons.generated'

/** Texto con emojis ("🛡️ Escudo activo") pintado con iconos a color. */
export default function IconText({ children }: { children: string }) {
  const parts = children.split(EMOJI)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 && ICONS[iconKey(part)] ? (
          <Icon key={i} e={part} />
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}
