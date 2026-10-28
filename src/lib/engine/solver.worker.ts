import { generateNoGuess } from './generate'
import type { NoGuessResult } from './generate'
import type { BoardConfig } from './types'

export interface GenerateRequest {
  id: number
  config: BoardConfig
  seed: number | string
  firstClick: number
}

/** Espera máxima antes de entregar un tablero sin garantía. */
const TIME_LIMIT_MS = 2000

export type GenerateResponse =
  | ({ id: number; ok: true; ms: number } & NoGuessResult)
  | { id: number; ok: false; error: string }

self.onmessage = (e: MessageEvent<GenerateRequest>) => {
  const { id, config, seed, firstClick } = e.data
  const t0 = performance.now()
  let response: GenerateResponse
  try {
    const result = generateNoGuess(
      config,
      seed,
      firstClick,
      undefined,
      TIME_LIMIT_MS,
    )
    response = { id, ok: true, ms: performance.now() - t0, ...result }
  } catch (err) {
    response = { id, ok: false, error: String(err) }
  }
  self.postMessage(response)
}
