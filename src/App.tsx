import { lazy, Suspense } from 'react'
import { Link, Route, Switch, useLocation } from 'wouter'
import CoinBadge from '@/components/hud/CoinBadge'

const Home = lazy(() => import('@/pages/Home'))
const Classic = lazy(() => import('@/pages/play/Classic'))
const Daily = lazy(() => import('@/pages/play/Daily'))
const Shop = lazy(() => import('@/pages/Shop'))
const ComingSoon = lazy(() => import('@/pages/ComingSoon'))

// Rutas del plan aún sin implementar
const PENDING: [path: string, title: string][] = [
  ['/play/time-attack', 'Contrarreloj'],
  ['/play/endless', 'Infinito'],
  ['/play/puzzle', 'Puzzle'],
  ['/play/puzzle/:level', 'Puzzle'],
  ['/stats', 'Estadísticas'],
  ['/settings', 'Ajustes'],
]

function App() {
  const [location] = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100">
      <header className="flex h-14 items-center justify-between gap-4 px-4">
        {/* En el menú el título grande ya hace de logo */}
        {location !== '/' && (
          <Link
            href="/"
            className="text-lg font-bold tracking-tight hover:text-emerald-300"
          >
            Buscaminas<span className="text-emerald-400">+</span>
          </Link>
        )}
        <div className="ml-auto">
          <CoinBadge />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pb-8">
        <Suspense fallback={<p className="py-16 text-slate-400">Cargando…</p>}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/play/classic" component={Classic} />
            <Route path="/play/daily" component={Daily} />
            <Route path="/shop" component={Shop} />
            {PENDING.map(([path, title]) => (
              <Route key={path} path={path}>
                <ComingSoon title={title} />
              </Route>
            ))}
            <Route>
              <ComingSoon title="Página no encontrada" />
            </Route>
          </Switch>
        </Suspense>
      </main>
    </div>
  )
}

export default App
