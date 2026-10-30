import { useId } from 'react'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Texto de ayuda bajo el label, enlazado con `aria-describedby`. */
  description?: string
  disabled?: boolean
  /** Centrado (sobre un tablero) o a la izquierda (en listas de ajustes). */
  align?: 'center' | 'start'
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  align = 'center',
}: Props) {
  const descriptionId = useId()
  return (
    <div
      className={`flex flex-col gap-0.5 ${align === 'start' ? 'items-start' : 'items-center'}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group inline-flex items-center gap-2 rounded-md px-1 py-1 text-sm text-slate-300 focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-50"
      >
        <span
          className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-600'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
          />
        </span>
        {label}
      </button>
      {description && (
        <p id={descriptionId} className="text-xs text-slate-400">
          {description}
        </p>
      )}
    </div>
  )
}
