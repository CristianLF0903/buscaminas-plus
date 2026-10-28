import { generateNoGuess } from './generate'
import type { NoGuessResult } from './generate'
import type { GenerateRequest, GenerateResponse } from './solver.worker'
import type { BoardConfig } from './types'

type Pending = {
  resolve: (r: NoGuessResult) => void
  reject: (e: Error) => void
}

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, Pending>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./solver.worker.ts', import.meta.url), {
    type: 'module',
  })
  worker.onmessage = (e: MessageEvent<GenerateResponse>) => {
    const res = e.data
    const req = pending.get(res.id)
    if (!req) return
    pending.delete(res.id)
    if (res.ok) {
      const { board, guaranteed, attempts, ms } = res
      if (import.meta.env.DEV) {
        console.debug(`[noGuess] ${attempts} intentos en ${ms.toFixed(0)} ms`)
      }
      req.resolve({ board, guaranteed, attempts })
    } else {
      req.reject(new Error(res.error))
    }
  }
  worker.onerror = (e) => {
    // Un fallo del worker rechaza todo lo pendiente; se recrea en el próximo uso
    for (const req of pending.values()) req.reject(new Error(e.message))
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

/**
 * Genera un tablero sin adivinar fuera del hilo principal. Sin soporte de
 * Worker (tests en node) corre en el mismo hilo.
 */
export function generateNoGuessAsync(
  config: BoardConfig,
  seed: number | string,
  firstClick: number,
): Promise<NoGuessResult> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(generateNoGuess(config, seed, firstClick))
  }
  const id = nextId++
  const request: GenerateRequest = { id, config, seed, firstClick }
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage(request)
  })
}
