import { lazy, Suspense } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import CoinBadge from '@/components/hud/CoinBadge'
import HeaderNav from '@/components/layout/HeaderNav'
import PageSkeleton from '@/components/ui/PageSkeleton'
import { PAGES } from '@/pages/routes'

const Home = lazy(PAGES.home)
const Classic = lazy(PAGES.classic)
const Daily = lazy(PAGES.daily)
const TimeAttack = lazy(PAGES.timeAttack)
const Endless = lazy(PAGES.endless)
const Shop = lazy(PAGES.shop)
const ComingSoon = lazy(PAGES.comingSoon)

// Rutas del plan aún sin implementar
const PENDING: [path: string, title: string][] = [
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
        {location !== '/' && <HeaderNav />}
        <div className="ml-auto">
          <CoinBadge />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-2 pb-8 sm:px-4">
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/play/classic" component={Classic} />
            <Route path="/play/daily" component={Daily} />
            <Route path="/play/time-attack" component={TimeAttack} />
            <Route path="/play/endless" component={Endless} />
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
