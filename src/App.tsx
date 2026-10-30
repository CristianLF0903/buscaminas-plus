import { lazy, Suspense } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import CoinBadge from '@/components/hud/CoinBadge'
import GameFeedback from '@/components/layout/GameFeedback'
import LeaveConfirmModal from '@/components/layout/LeaveConfirmModal'
import MenuLink from '@/components/layout/MenuLink'
import SettingsSync from '@/components/layout/SettingsSync'
import { buttonClass } from '@/components/ui/buttonStyles'
import PageSkeleton from '@/components/ui/PageSkeleton'
import { PAGES } from '@/pages/routes'

const Home = lazy(PAGES.home)
const Classic = lazy(PAGES.classic)
const Daily = lazy(PAGES.daily)
const TimeAttack = lazy(PAGES.timeAttack)
const Endless = lazy(PAGES.endless)
const PuzzleSelect = lazy(PAGES.puzzleSelect)
const PuzzleLevel = lazy(PAGES.puzzleLevel)
const Shop = lazy(PAGES.shop)
const Stats = lazy(PAGES.stats)
const Settings = lazy(PAGES.settings)
const ComingSoon = lazy(PAGES.comingSoon)

function App() {
  const [location] = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100">
      <header className="flex h-14 items-center justify-between gap-4 px-4">
        {/* En el menú el título grande ya hace de logo */}
        {location !== '/' && (
          <MenuLink className="text-lg font-bold tracking-tight hover:text-emerald-300">
            Buscaminas<span className="text-emerald-400">+</span>
          </MenuLink>
        )}
        <div className="ml-auto">
          <CoinBadge />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-2 pb-8 sm:px-4">
        {location !== '/' && (
          <div className="mb-2 w-full max-w-3xl">
            <MenuLink
              aria-label="Volver al menú principal"
              className={`${buttonClass('ghost')} -ml-2`}
            >
              ← Menú
            </MenuLink>
          </div>
        )}
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/play/classic" component={Classic} />
            <Route path="/play/daily" component={Daily} />
            <Route path="/play/time-attack" component={TimeAttack} />
            <Route path="/play/endless" component={Endless} />
            <Route path="/play/puzzle" component={PuzzleSelect} />
            <Route path="/play/puzzle/:level" component={PuzzleLevel} />
            <Route path="/shop" component={Shop} />
            <Route path="/stats" component={Stats} />
            <Route path="/settings" component={Settings} />
            <Route>
              <ComingSoon title="Página no encontrada" />
            </Route>
          </Switch>
        </Suspense>
      </main>
      <LeaveConfirmModal />
      <SettingsSync />
      <GameFeedback />
    </div>
  )
}

export default App
