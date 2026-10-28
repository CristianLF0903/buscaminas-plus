export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
  ghost: 'text-slate-300 hover:bg-slate-800 hover:text-slate-100',
}

/** Clases de botón, también para `Link` con aspecto de botón. */
export function buttonClass(variant: ButtonVariant = 'secondary'): string {
  return `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]}`
}
