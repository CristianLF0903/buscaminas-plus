import { useState } from 'react'
import Board from '@/components/board/Board'
import MineCounter from '@/components/hud/MineCounter'
import ResetButton from '@/components/hud/ResetButton'
import Timer from '@/components/hud/Timer'
import type { BoardConfig } from '@/lib/engine/types'
import { useGameStore } from '@/store/useGameStore'

// Temporal hasta la tarea de modo clásico y rutas
const PRESETS: Record<string, BoardConfig> = {
  Fácil: { width: 9, height: 9, mines: 10 },
  Medio: { width: 16, height: 16, mines: 40 },
  Difícil: { width: 30, height: 16, mines: 99 },
}

function App() {
  const newGame = useGameStore((s) => s.newGame)
  const [preset, setPreset] = useState('Fácil')

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 bg-slate-900 px-4 py-8 text-slate-100">
      <h1 className="text-4xl font-bold tracking-tight">
        Buscaminas<span className="text-emerald-400">+</span>
      </h1>

      <div className="flex gap-2">
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setPreset(name)
              newGame(PRESETS[name])
            }}
            className={`rounded-md px-3 py-1 text-sm ${name === preset ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex max-w-full flex-col items-center gap-3 rounded-xl bg-slate-800 p-3 shadow-xl">
        <div className="flex w-full items-center justify-between gap-4">
          <MineCounter />
          <ResetButton />
          <Timer />
        </div>
        <Board />
      </div>
    </main>
  )
}

export default App
