import { useState } from 'react'
import { Link } from 'wouter'
import { buttonClass } from '@/components/ui/buttonStyles'
import Stars from '@/components/ui/Stars'
import {
  countStars,
  isUnlocked,
  LEVELS_PER_PAGE,
  pageOf,
  TUTORIALS,
} from '@/lib/modes/puzzle'
import { introducedAt, isBoss } from '@/lib/puzzle/levels'
import { recordKey, usePlayerStore } from '@/store/usePlayerStore'
import Icon from '@/components/ui/Icon'

const NO_STARS: Record<number, number> = {}

function LevelTile({
  level,
  stars,
  unlocked,
  next,
}: {
  level: number
  stars: number
  unlocked: boolean
  next: boolean
}) {
  const boss = isBoss(level)
  const intro = introducedAt(level)
  const base =
    'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm font-semibold tabular-nums'

  if (!unlocked) {
    return (
      <div
        aria-label={`Nivel ${level}, bloqueado`}
        className={`${base} bg-slate-800/50 text-slate-600`}
      >
        <Icon e={boss ? '👑' : '🔒'} />
        <span className="text-[10px]">{level}</span>
      </div>
    )
  }

  const ring = next
    ? 'ring-2 ring-emerald-400'
    : boss
      ? 'ring-2 ring-amber-400/70'
      : ''
  return (
    <Link
      href={`/play/puzzle/${level}`}
      aria-label={`Nivel ${level}${boss ? ', jefe' : ''}${next ? ', siguiente' : ''}`}
      className={`${base} ${ring} bg-slate-700 transition hover:bg-slate-600 focus-visible:outline-2 focus-visible:outline-emerald-400`}
    >
      {(boss || intro) && (
        <span aria-hidden className="absolute -top-1.5 -right-1 text-xs">
          <Icon e={boss ? '👑' : TUTORIALS[intro!].icon} />
        </span>
      )}
      {level}
      <Stars mask={stars} />
    </Link>
  )
}

export default function PuzzleSelect() {
  const record = usePlayerStore(
    (s) => s.records[recordKey('puzzle', 'default')],
  )
  const maxLevel = record?.maxLevel ?? 0
  const stars = record?.stars ?? NO_STARS
  const next = maxLevel + 1
  const lastPage = pageOf(next)
  const [page, setPage] = useState(lastPage)
  const totalStars = Object.values(stars).reduce(
    (sum, mask) => sum + countStars(mask),
    0,
  )

  const first = page * LEVELS_PER_PAGE + 1
  const levels = Array.from({ length: LEVELS_PER_PAGE }, (_, i) => first + i)

  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Puzzle</h1>
        <p className="text-sm text-slate-400">
          Niveles infinitos con formas y reglas nuevas.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <span>
          <Icon e="🧩" /> Completados <b className="font-mono">{maxLevel}</b>
        </span>
        <span>
          <span className="text-amber-300">★</span> Estrellas{' '}
          <b className="font-mono">{totalStars}</b>
        </span>
        <Link href={`/play/puzzle/${next}`} className={buttonClass('primary')}>
          {maxLevel ? `Continuar: nivel ${next}` : 'Empezar'}
        </Link>
      </div>

      <nav
        aria-label="Páginas de niveles"
        className="flex items-center gap-2 text-sm"
      >
        <button
          type="button"
          onClick={() => setPage((p) => p - 1)}
          disabled={page === 0}
          aria-label="Niveles anteriores"
          className={buttonClass('ghost')}
        >
          ←
        </button>
        <span className="min-w-24 text-center font-mono tabular-nums">
          {first}–{first + LEVELS_PER_PAGE - 1}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= lastPage}
          aria-label="Niveles siguientes"
          className={buttonClass('ghost')}
        >
          →
        </button>
      </nav>

      <ol className="grid w-full grid-cols-5 gap-2 sm:grid-cols-10">
        {levels.map((level) => (
          <li key={level}>
            <LevelTile
              level={level}
              stars={stars[level] ?? 0}
              unlocked={isUnlocked(level, maxLevel)}
              next={level === next}
            />
          </li>
        ))}
      </ol>

      <p className="text-center text-xs text-slate-400">
        <Icon e="⭐" /> completar · <Icon e="⭐" /> bajo el tiempo objetivo ·{' '}
        <Icon e="⭐" /> sin power-ups · <Icon e="👑" /> jefe
      </p>
    </section>
  )
}
