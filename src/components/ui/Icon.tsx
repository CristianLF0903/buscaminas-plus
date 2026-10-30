import { iconKey } from './emoji'
import { ICONS } from './icons.generated'

/**
 * Icono a color (Fluent Emoji Flat) en lugar de un emoji. Mide 1em, como
 * el texto que lo rodea. Sin `label` es decorativo.
 */
export default function Icon({
  e,
  label,
  className = '',
}: {
  /** El emoji que reemplaza, p. ej. "🚩". */
  e: string
  label?: string
  className?: string
}) {
  const body = ICONS[iconKey(e)]
  if (!body) return <span className={className}>{e}</span>
  return (
    <svg
      viewBox="0 0 32 32"
      width="1em"
      height="1em"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 align-[-0.125em] ${className}`}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}
