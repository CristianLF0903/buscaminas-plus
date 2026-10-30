import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import ConfirmModal from '@/components/modals/ConfirmModal'
import Button from '@/components/ui/Button'
import { CLASSIC_PRESETS } from '@/lib/modes/classic'
import { previousDay, streakAt, todayUTC } from '@/lib/modes/daily'
import { ENDLESS_DIFFICULTIES } from '@/lib/modes/endless'
import { countStars } from '@/lib/modes/puzzle'
import {
  buildExport,
  exportFileName,
  parseImport,
  PLAYER_STORAGE_KEY,
} from '@/lib/progress'
import { formatTime } from '@/lib/time'
import { recordKey, usePlayerStore } from '@/store/usePlayerStore'
import type { KeyStats } from '@/store/usePlayerStore'

const CLASSIC_KEYS = [
  ...ENDLESS_DIFFICULTIES.map((d) => [d, CLASSIC_PRESETS[d].label] as const),
  ['custom', 'Personalizado'] as const,
]

const percent = (won: number, played: number) =>
  played ? `${Math.round((won / played) * 100)}%` : '—'

const time = (ms: number | undefined) => (ms ? formatTime(ms) : '—')

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-slate-800 p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** Cifras en grilla de 2–3 columnas: cabe en móvil sin scroll. */
function Figures({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="text-xs text-slate-400">{label}</dt>
          <dd className="font-mono text-lg tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function keyFigures(
  s: KeyStats | undefined,
  bestTimeMs?: number,
): [string, ReactNode][] {
  const played = s?.played ?? 0
  const won = s?.won ?? 0
  return [
    ['Partidas', played],
    ['Victorias', `${won} · ${percent(won, played)}`],
    ['Racha', `${s?.streak ?? 0} / ${s?.bestStreak ?? 0}`],
    ['Mejor tiempo', time(bestTimeMs)],
    ['Tiempo promedio', time(won ? (s?.winTimeMs ?? 0) / won : undefined)],
  ]
}

const CALENDAR_DAYS = 28

/** Últimas 4 semanas del reto diario. */
function DailyCalendar() {
  const daily = usePlayerStore((s) => s.daily)
  const days: string[] = []
  for (let d = todayUTC(); days.length < CALENDAR_DAYS; d = previousDay(d)) {
    days.unshift(d)
  }
  return (
    <ol
      aria-label="Últimos 28 días del reto diario"
      className="grid grid-cols-7 gap-1"
    >
      {days.map((date) => {
        const entry = daily[date]
        const state = !entry?.finished
          ? 'Sin jugar'
          : entry.won
            ? 'Resuelto'
            : 'Fallado'
        return (
          <li
            key={date}
            title={`${date}: ${state}`}
            aria-label={`${date}: ${state}`}
            className={`flex aspect-square items-center justify-center rounded text-xs ${
              state === 'Resuelto'
                ? 'bg-emerald-500/80 text-slate-950'
                : state === 'Fallado'
                  ? 'bg-rose-500/60'
                  : 'bg-slate-700/60 text-slate-500'
            }`}
          >
            {Number(date.slice(8))}
          </li>
        )
      })}
    </ol>
  )
}

function ProgressTools() {
  const resetStats = usePlayerStore((s) => s.resetStats)
  const fileInput = useRef<HTMLInputElement>(null)
  const [confirm, setConfirm] = useState<'reset' | 'import' | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const exportProgress = () => {
    const data = buildExport(localStorage.getItem(PLAYER_STORAGE_KEY))
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = exportFileName()
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Progreso exportado.')
  }

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const res = parseImport(await file.text())
    if (!res.ok) {
      setMessage(res.error)
      return
    }
    setPending(res.stored)
    setConfirm('import')
  }

  const applyImport = async () => {
    if (!pending) return
    localStorage.setItem(PLAYER_STORAGE_KEY, pending)
    await usePlayerStore.persist.rehydrate()
    setPending(null)
    setConfirm(null)
    setMessage('Progreso importado.')
  }

  return (
    <Card title="Progreso">
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportProgress}>⬇️ Exportar</Button>
        <Button onClick={() => fileInput.current?.click()}>⬆️ Importar</Button>
        <Button onClick={() => setConfirm('reset')}>
          🗑️ Reiniciar estadísticas
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={(e) => void pickFile(e)}
          className="hidden"
          aria-hidden
          tabIndex={-1}
        />
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {message}
      </p>
      <ConfirmModal
        open={confirm === 'reset'}
        title="¿Reiniciar estadísticas?"
        message="Se borran partidas, victorias y rachas. Tus monedas, power-ups, récords y niveles se quedan."
        confirmLabel="Reiniciar"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          resetStats()
          setConfirm(null)
          setMessage('Estadísticas reiniciadas.')
        }}
      />
      <ConfirmModal
        open={confirm === 'import'}
        title="¿Reemplazar tu progreso?"
        message="El progreso actual se sustituye por el del archivo. Exporta antes si quieres conservarlo."
        confirmLabel="Importar"
        onCancel={() => {
          setPending(null)
          setConfirm(null)
        }}
        onConfirm={() => void applyImport()}
      />
    </Card>
  )
}

export default function Stats() {
  const stats = usePlayerStore((s) => s.stats)
  const records = usePlayerStore((s) => s.records)
  const daily = usePlayerStore((s) => s.daily)
  const byKey = stats.byKey
  const today = todayUTC()
  // Si hoy aún no se jugó, la racha sigue viva desde ayer
  const dailyStreak = daily[today]?.finished
    ? streakAt(daily, today)
    : streakAt(daily, previousDay(today))
  const dailyStats = byKey[recordKey('daily', 'default')]
  const puzzle = records[recordKey('puzzle', 'default')]
  const puzzleStats = byKey[recordKey('puzzle', 'default')]
  const totalStars = Object.values(puzzle?.stars ?? {}).reduce(
    (sum, mask) => sum + countStars(mask),
    0,
  )

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-center text-2xl font-bold">Estadísticas</h1>

      <Card title="Resumen">
        <Figures
          items={[
            ['Partidas', stats.played],
            ['Victorias', `${stats.won} · ${percent(stats.won, stats.played)}`],
            [
              'Racha (actual / mejor)',
              `${stats.currentWinStreak} / ${stats.bestWinStreak}`,
            ],
            ['🪙 Monedas ganadas', stats.coinsEarned ?? 0],
            ['Power-ups usados', stats.powerUpsUsed ?? 0],
          ]}
        />
      </Card>

      <Card title="💣 Clásico">
        <div className="flex flex-col gap-4">
          {CLASSIC_KEYS.map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1">
              <h3 className="text-sm text-slate-300">{label}</h3>
              <Figures
                items={keyFigures(
                  byKey[recordKey('classic', key)],
                  records[recordKey('classic', key)]?.bestTimeMs,
                )}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="📅 Reto diario">
        <Figures
          items={[
            ['Racha', dailyStreak],
            [
              'Mejor racha',
              records[recordKey('daily', 'default')]?.bestStreak ?? 0,
            ],
            ['Jugados', dailyStats?.played ?? 0],
            [
              'Resueltos',
              `${dailyStats?.won ?? 0} · ${percent(dailyStats?.won ?? 0, dailyStats?.played ?? 0)}`,
            ],
            [
              'Mejor tiempo',
              time(records[recordKey('daily', 'default')]?.bestTimeMs),
            ],
          ]}
        />
        <DailyCalendar />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="⏱️ Contrarreloj">
          <Figures
            items={[
              [
                'Récord',
                `${records[recordKey('timeAttack', 'default')]?.maxBoards ?? 0} tableros`,
              ],
              [
                'Sesiones',
                byKey[recordKey('timeAttack', 'default')]?.played ?? 0,
              ],
            ]}
          />
        </Card>

        <Card title="🧩 Puzzle">
          <Figures
            items={[
              ['Nivel máximo', puzzle?.maxLevel ?? 0],
              ['★ Estrellas', totalStars],
              ['Intentos', puzzleStats?.played ?? 0],
              ['Superados', puzzleStats?.won ?? 0],
            ]}
          />
        </Card>
      </div>

      <Card title="♾️ Infinito">
        <Figures
          items={ENDLESS_DIFFICULTIES.map((d) => {
            const rec = records[recordKey('endless', d)]
            return [
              CLASSIC_PRESETS[d].label,
              <>
                {rec?.maxBoards ?? 0}
                <span className="text-xs text-slate-400">
                  {' '}
                  · sin power-ups {rec?.maxBoardsNoPowerUps ?? 0}
                </span>
              </>,
            ]
          })}
        />
      </Card>

      <ProgressTools />
    </div>
  )
}
