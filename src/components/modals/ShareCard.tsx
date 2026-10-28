import { useRef, useState } from 'react'
import Button from '@/components/ui/Button'

/** Vista previa del resultado + copiar / compartir (navigator.share en móvil). */
export default function ShareCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // Sin permiso de portapapeles: el texto queda visible para copiarlo a mano
    }
  }

  const share = async () => {
    try {
      await navigator.share({ text })
    } catch {
      // Cancelado por el usuario
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <pre className="rounded-lg bg-slate-900 p-3 text-center font-sans text-sm leading-snug whitespace-pre-wrap text-slate-200 select-all">
        {text}
      </pre>
      <div className={`grid gap-2 ${canShare ? 'grid-cols-2' : ''}`}>
        <Button variant="primary" onClick={copy}>
          {copied ? '¡Copiado!' : 'Copiar resultado'}
        </Button>
        {canShare && <Button onClick={share}>Compartir</Button>}
      </div>
    </div>
  )
}
