import { useCallback, useEffect, useState } from 'react'
import GameView from '@/components/board/GameView'
import ResultModal from '@/components/modals/ResultModal'
import ShareCard from '@/components/modals/ShareCard'
import Button from '@/components/ui/Button'
import { useConfirmLeave } from '@/hooks/useConfirmLeave'
import { useGameRewards } from '@/hooks/useGameRewards'
import type { DescribeResult } from '@/hooks/useGameRewards'
import { useNow } from '@/hooks/useNow'
import { LOGIC_TAG } from '@/lib/copy'
import {
  DAILY_CONFIG,
  dailyFirstClick,
  dailyNumber,
  dailySeed,
  msUntilNextDaily,
  previousDay,
  streakAt,
  todayUTC,
} from '@/lib/modes/daily'
import type { DailyEntry } from '@/lib/modes/daily'
import { progressGrid, shareText } from '@/lib/share/daily'
import { formatCountdown, formatTime } from '@/lib/time'
import { useGameStore } from '@/store/useGameStore'
import { usePlayerStore } from '@/store/usePlayerStore'
import Icon from '@/components/ui/Icon'
import IconText from '@/components/ui/IconText'

function Countdown({ onNewDay }: { onNewDay: () => void }) {
  const now = useNow()
  const left = msUntilNextDaily(new Date(now))
  return (
    <p className="text-center text-sm text-slate-400">
      Próximo reto en{' '}
      <span className="font-mono text-slate-200 tabular-nums">
        {formatCountdown(left)}
      </span>
      {left < 1000 && (
        <Button className="ml-2" onClick={onNewDay}>
          Jugar el nuevo reto
        </Button>
      )}
    </p>
  )
}

function Summary({
  number,
  entry,
  onNewDay,
}: {
  number: number
  entry: DailyEntry
  onNewDay: () => void
}) {
  const won = entry.won === true
  const text = shareText({
    number,
    won,
    timeMs: entry.timeMs,
    streak: entry.streak ?? 0,
    grid: entry.grid,
  })
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-slate-800 p-5">
      <p className="text-center text-lg font-semibold">
        <IconText>
          {won
            ? `✅ Resuelto en ${formatTime(entry.timeMs ?? 0)}`
            : entry.grid
              ? '❌ Hoy no salió'
              : '❌ Intento abandonado'}
        </IconText>
      </p>
      {won && (entry.streak ?? 0) > 0 && (
        <p className="text-center text-amber-300">
          <Icon e="🔥" /> Racha de {entry.streak}{' '}
          {entry.streak === 1 ? 'día' : 'días'}
        </p>
      )}
      <ShareCard text={text} />
      <Countdown onNewDay={onNewDay} />
    </div>
  )
}

export default function Daily() {
  const [date, setDate] = useState(todayUTC)
  const number = dailyNumber(date)
  const seed = dailySeed(date)
  const entry = usePlayerStore((s) => s.daily[date])
  const daily = usePlayerStore((s) => s.daily)
  const bestStreak = usePlayerStore(
    (s) => s.records['daily:default']?.bestStreak ?? 0,
  )
  const startDaily = usePlayerStore((s) => s.startDaily)
  const newGame = useGameStore((s) => s.newGame)
  const reveal = useGameStore((s) => s.reveal)
  // El store tiene la partida de este reto (no se salió de la página)
  const holdsGame = useGameStore((s) => s.fixedSeed && s.seed === seed)

  const describe = useCallback<DescribeResult>(
    (s) => ({
      mode: 'daily',
      difficulty: 'default',
      date,
      grid: progressGrid(s.board, s.explodedId),
    }),
    [date],
  )
  const reward = useGameRewards(describe)
  const playing = useGameStore((s) => s.status === 'playing')

  // La partida sigue en el store al salir: se puede volver y terminarla.
  // Se pierde (derrota) si otra partida la reemplaza o se recarga la página.
  useConfirmLeave(
    holdsGame && playing
      ? 'Tu intento de hoy queda en pausa, pero el reloj sigue corriendo. Puedes volver a terminarlo; si juegas otro modo o recargas la página, contará como intento usado.'
      : null,
  )

  // Intento empezado pero la partida ya no está (recarga o salida): derrota
  useEffect(() => {
    const current = usePlayerStore.getState().daily[date]
    const game = useGameStore.getState()
    const live = game.fixedSeed && game.seed === seed
    if (current && !current.finished && !live) {
      usePlayerStore.getState().finishGame({
        mode: 'daily',
        difficulty: 'default',
        won: false,
        timeMs: 0,
        usedPowerUps: 0,
        date,
      })
    }
  }, [date, seed])

  const start = () => {
    if (!startDaily(date)) return
    newGame(DAILY_CONFIG, seed)
    // El primer clic es fijo: todos arrancan desde la misma celda
    reveal(dailyFirstClick(date))
  }

  const streakSoFar = streakAt(daily, previousDay(date))

  return (
    <section className="flex w-full flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Reto diario #{number}</h1>
        <p className="text-sm text-slate-400">
          {date} · 16×16 · 40 minas · {LOGIC_TAG} · sin power-ups
        </p>
      </div>

      {!entry && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-slate-800 p-5 text-center">
          <p className="text-slate-300">
            Un tablero al día, el mismo para todos. Tienes un solo intento.
          </p>
          <div className="flex gap-6 text-sm">
            <span>
              <Icon e="🔥" /> Racha <b className="font-mono">{streakSoFar}</b>
            </span>
            <span>
              <Icon e="🏆" /> Mejor <b className="font-mono">{bestStreak}</b>
            </span>
          </div>
          <Button variant="primary" onClick={start} autoFocus>
            Comenzar
          </Button>
        </div>
      )}

      {entry && holdsGame && (
        <>
          <GameView mode="daily" allowReset={false} />
          <ResultModal reward={reward} allowRetry={false}>
            {entry.finished && (
              <ShareCard
                text={shareText({
                  number,
                  won: entry.won === true,
                  timeMs: entry.timeMs,
                  streak: entry.streak ?? 0,
                  grid: entry.grid,
                })}
              />
            )}
          </ResultModal>
        </>
      )}

      {entry?.finished && (
        <Summary
          number={number}
          entry={entry}
          onNewDay={() => setDate(todayUTC())}
        />
      )}
    </section>
  )
}
