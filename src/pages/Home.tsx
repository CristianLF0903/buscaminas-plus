import { Link } from 'wouter'
import { buttonClass } from '@/components/ui/buttonStyles'

interface Mode {
  href: string
  icon: string
  title: string
  description: string
  ready: boolean
}

const MODES: Mode[] = [
  {
    href: '/play/classic',
    icon: '💣',
    title: 'Clásico',
    description: 'Fácil, medio, difícil o a tu medida.',
    ready: true,
  },
  {
    href: '/play/daily',
    icon: '📅',
    title: 'Reto diario',
    description: 'El mismo tablero para todos, cada día.',
    ready: true,
  },
  {
    href: '/play/time-attack',
    icon: '⏱️',
    title: 'Contrarreloj',
    description: 'Cada tablero resuelto suma segundos.',
    ready: true,
  },
  {
    href: '/play/endless',
    icon: '♾️',
    title: 'Infinito',
    description: 'Tableros seguidos hasta que caigas.',
    ready: false,
  },
  {
    href: '/play/puzzle',
    icon: '🧩',
    title: 'Puzzle',
    description: 'Niveles con formas y reglas nuevas.',
    ready: false,
  },
]

export default function Home() {
  return (
    <section className="flex w-full max-w-3xl flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Buscaminas<span className="text-emerald-400">+</span>
        </h1>
        <p className="mt-2 text-slate-400">Sin adivinar. Con power-ups.</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode) => (
          <li key={mode.href}>
            <Link
              href={mode.href}
              className="group flex h-full items-start gap-4 rounded-xl bg-slate-800 p-4 ring-emerald-400/60 transition hover:bg-slate-700 hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="text-3xl" aria-hidden>
                {mode.icon}
              </span>
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 font-semibold">
                  {mode.title}
                  {!mode.ready && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                      Próximamente
                    </span>
                  )}
                </span>
                <span className="text-sm text-slate-400">
                  {mode.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <nav className="flex flex-wrap justify-center gap-2">
        <Link href="/shop" className={buttonClass('ghost')}>
          🛒 Tienda
        </Link>
        <Link href="/stats" className={buttonClass('ghost')}>
          📊 Estadísticas
        </Link>
        <Link href="/settings" className={buttonClass('ghost')}>
          ⚙️ Ajustes
        </Link>
      </nav>
    </section>
  )
}
