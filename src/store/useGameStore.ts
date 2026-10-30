import { create } from 'zustand'
import { createEmptyBoard, placeMines } from '@/lib/engine/generate'
import * as engine from '@/lib/engine/reveal'
import { generateNoGuessAsync } from '@/lib/engine/workerClient'
import type { MoveResult } from '@/lib/engine/reveal'
import type { Board, BoardConfig, GameStatus } from '@/lib/engine/types'
import {
  absorbMine,
  applyRadar,
  detect,
  findHint,
  MAX_POWER_UPS_PER_GAME,
  TIME_PLUS_MS,
} from '@/lib/powerups'
import type { Hint } from '@/lib/powerups'
import type { PowerUpId } from '@/lib/powerups/ids'
import { usePlayerStore } from './usePlayerStore'

export interface GameState {
  config: BoardConfig
  seed: number | string
  /** La semilla vino de fuera (diario, puzzle): `reset` la conserva. */
  fixedSeed: boolean
  board: Board
  status: GameStatus
  startedAt: number | null
  endedAt: number | null
  flagsUsed: number
  /** Mina que hizo perder, para resaltarla. */
  explodedId: number | null
  /** Generando un tablero sin adivinar tras el primer clic: input bloqueado. */
  generating: boolean
  /** Con `noGuess`: si se encontró tablero sin adivinar. `null` = no aplica. */
  guaranteed: boolean | null
  /** Power-ups usados en la partida (máx. 3); afecta recompensas y estrellas. */
  usedPowerUps: number
  /** Cambia en cada `newGame`/`reset`; descarta generaciones de partidas viejas. */
  gameId: number
  /** Power-up esperando que el jugador elija celda (radar, detector). */
  activePowerUp: PowerUpId | null
  /** La próxima mina revelada se absorbe. */
  shieldActive: boolean
  /** Resultados del detector: id → es mina. */
  detected: Record<number, boolean>
  /** Celda resaltada por la Pista. */
  hint: Hint | null
  /** Mensaje corto del último power-up (razón de la pista, escudo, etc.). */
  notice: string | null
  /** Segundos extra de Tiempo+ (contrarreloj). */
  timeBonusMs: number

  newGame: (config: BoardConfig, seed?: number | string) => void
  /**
   * Arranca con un tablero ya minado (pre-generado) abriendo `firstClick`.
   * `carry` conserva power-ups usados y escudo: varios tableros, una partida.
   * `keepShield` conserva solo el escudo (límite de power-ups por tablero).
   */
  loadBoard: (
    config: BoardConfig,
    board: Board,
    opts: {
      seed: number | string
      firstClick: number
      guaranteed?: boolean | null
      carry?: boolean
      keepShield?: boolean
    },
  ) => void
  /** Asíncrono solo en el primer clic con `config.noGuess`. */
  reveal: (id: number) => void | Promise<void>
  toggleFlag: (id: number) => void
  chord: (id: number) => void
  reset: () => void
  /**
   * Usa un power-up del inventario. Radar y Detector quedan esperando celda
   * (`activePowerUp`); el resto se aplica ya. false si no se pudo usar.
   */
  activatePowerUp: (id: PowerUpId) => boolean
  /** Aplica el power-up activo sobre una celda. */
  targetCell: (id: number) => boolean
  cancelPowerUp: () => void
}

const DEFAULT_CONFIG: BoardConfig = { width: 9, height: 9, mines: 10 }

const countFlags = (board: Board) =>
  board.cells.reduce((n, c) => n + (c.flagged ? 1 : 0), 0)

let gameCounter = 0

function initialState(config: BoardConfig, seed?: number | string) {
  return {
    gameId: ++gameCounter,
    generating: false,
    guaranteed: null,
    usedPowerUps: 0,
    config,
    // Única fuente de no-determinismo: el motor solo recibe la semilla
    seed: seed ?? Date.now(),
    fixedSeed: seed !== undefined,
    board: createEmptyBoard(config),
    status: 'idle' as GameStatus,
    startedAt: null,
    endedAt: null,
    flagsUsed: 0,
    explodedId: null,
    activePowerUp: null,
    shieldActive: false,
    detected: {},
    hint: null,
    notice: null,
    timeBonusMs: 0,
  }
}

/** Power-ups que se pueden usar ahora mismo (estado de la partida y límite). */
export const canUsePowerUps = (s: GameState) =>
  s.status === 'playing' &&
  !s.generating &&
  s.usedPowerUps < MAX_POWER_UPS_PER_GAME

export const useGameStore = create<GameState>()((set, get) => {
  /** Aplica el resultado de una jugada y cierra la partida si terminó. */
  const apply = (result: MoveResult) => {
    if (result.board === get().board) return
    let { board, status, revealedIds } = result
    let notice = null
    if (status === 'lost' && get().shieldActive) {
      ;({ board, status, revealedIds } = absorbMine(result))
      notice = '🛡️ ¡El escudo te salvó! La mina quedó marcada.'
      set({ shieldActive: false })
    }
    const over = status === 'won' || status === 'lost'
    const lost = status === 'lost'
    set({
      board: lost ? engine.revealAllMines(board) : board,
      status,
      flagsUsed: countFlags(board),
      endedAt: over ? Date.now() : null,
      explodedId: lost
        ? (revealedIds.find((id) => board.cells[id].mineWeight > 0) ?? null)
        : null,
      // Cualquier jugada invalida la pista anterior
      hint: null,
      notice,
      ...(over ? { activePowerUp: null } : {}),
    })
  }

  /** Cobra del inventario y cuenta el uso. false si no hay unidades. */
  const spend = (id: PowerUpId) => {
    if (!usePlayerStore.getState().consumePowerUp(id)) return false
    set((s) => ({ usedPowerUps: s.usedPowerUps + 1 }))
    return true
  }

  return {
    ...initialState(DEFAULT_CONFIG),

    newGame: (config, seed) => set(initialState(config, seed)),

    loadBoard: (config, mined, opts) => {
      const { seed, firstClick, guaranteed, carry, keepShield } = opts
      const { usedPowerUps, shieldActive } = get()
      set({
        ...initialState(config, seed),
        board: mined,
        startedAt: Date.now(),
        guaranteed: guaranteed ?? null,
        ...(carry ? { usedPowerUps } : {}),
        ...(carry || keepShield ? { shieldActive } : {}),
      })
      apply(engine.reveal(mined, firstClick))
    },

    reveal: (id) => {
      const { status, board, seed, config, generating, gameId } = get()
      if (status === 'won' || status === 'lost' || generating) return
      if (status !== 'idle') {
        apply(engine.reveal(board, id))
        return
      }

      // Primer clic: se colocan las minas evitando esta celda y sus vecinos
      if (!board.cells[id] || board.cells[id].flagged) return
      const start = (mined: Board) => {
        set({ board: mined, startedAt: Date.now(), generating: false })
        apply(engine.reveal(mined, id))
      }
      if (!config.noGuess) {
        start(placeMines(board, seed, id, config.doubleMines))
        return
      }

      set({ generating: true })
      return generateNoGuessAsync(config, seed, id)
        .then(({ board: mined, guaranteed, attempts }) => {
          if (!guaranteed) {
            console.warn(
              `[noGuess] sin tablero garantizado tras ${attempts} intentos`,
            )
          }
          return { mined, guaranteed }
        })
        .catch((err) => {
          console.error('[noGuess] fallo del generador', err)
          const mined = placeMines(board, seed, id, config.doubleMines)
          return { mined, guaranteed: false }
        })
        .then(({ mined, guaranteed }) => {
          // Partida reiniciada mientras se generaba: descartar
          if (get().gameId !== gameId) return
          set({ guaranteed })
          // Conservar banderas puestas antes del primer clic
          const flagged = get().board.cells
          start({
            ...mined,
            cells: mined.cells.map((c) =>
              flagged[c.id].flagged ? { ...c, flagged: true } : c,
            ),
          })
        })
    },

    toggleFlag: (id) => {
      const { status, board, generating } = get()
      if (status === 'won' || status === 'lost' || generating) return
      const res = engine.toggleFlag(board, id)
      // Banderas antes del primer clic no inician la partida
      apply({ ...res, status })
    },

    chord: (id) => {
      if (get().status !== 'playing') return
      apply(engine.chord(get().board, id))
    },

    reset: () => {
      const { config, seed, fixedSeed } = get()
      set(initialState(config, fixedSeed ? seed : undefined))
    },

    activatePowerUp: (id) => {
      const s = get()
      if (!canUsePowerUps(s)) return false
      if ((usePlayerStore.getState().inventory[id] ?? 0) <= 0) return false

      switch (id) {
        case 'radar':
        case 'detector':
          // Se cobra al elegir la celda; repetir el botón cancela
          set({ activePowerUp: s.activePowerUp === id ? null : id })
          return true
        case 'shield':
          if (s.shieldActive || !spend(id)) return false
          set({
            shieldActive: true,
            notice: '🛡️ Escudo activo: la próxima mina no explota.',
          })
          return true
        case 'timePlus':
          if (!spend(id)) return false
          set((st) => ({
            timeBonusMs: st.timeBonusMs + TIME_PLUS_MS,
            notice: '⏳ +15 segundos',
          }))
          return true
        case 'hint': {
          const hint = findHint(s.board)
          if (!hint) {
            // Sin deducción posible: no se consume
            set({ notice: '💡 No hay ninguna deducción lógica ahora mismo.' })
            return false
          }
          if (!spend(id)) return false
          set({ hint, activePowerUp: null, notice: `💡 ${hint.reason}` })
          return true
        }
      }
    },

    targetCell: (id) => {
      const s = get()
      const active = s.activePowerUp
      if (!active || !canUsePowerUps(s)) return false
      if (active === 'radar') {
        if (!s.board.cells[id] || !spend(active)) return false
        set({ activePowerUp: null })
        apply(applyRadar(get().board, id))
        if (get().status === 'playing') set({ notice: '📡 Área despejada.' })
        return true
      }
      // Detector: solo sobre celdas ocultas aún no analizadas
      const isMine = detect(s.board, id)
      if (isMine === null || id in s.detected || !spend(active)) return false
      set((st) => ({
        activePowerUp: null,
        detected: { ...st.detected, [id]: isMine },
        notice: isMine ? '🔍 ¡Es una mina!' : '🔍 Celda segura.',
      }))
      return true
    },

    cancelPowerUp: () => set({ activePowerUp: null }),
  }
})

export const selectMinesLeft = (s: GameState) => s.board.mineCount - s.flagsUsed

/** Milisegundos jugados. `now` se inyecta para poder testear. */
export function elapsedMs(
  startedAt: number | null,
  endedAt: number | null,
  now: number,
): number {
  if (startedAt === null) return 0
  return Math.max(0, (endedAt ?? now) - startedAt)
}

export const selectElapsed = (s: GameState, now = Date.now()) =>
  elapsedMs(s.startedAt, s.endedAt, now)
