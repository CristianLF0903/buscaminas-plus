/**
 * Efectos de sonido sintetizados con Web Audio: sin archivos que descargar.
 * El `AudioContext` se crea con el primer gesto del jugador (los navegadores
 * no permiten sonar antes) y el ruido de la explosión se precalcula ahí.
 */

export type Sfx = 'reveal' | 'flag' | 'explode' | 'win'

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)
  if (!Ctor) return null
  ctx = new Ctor()
  // Ruido blanco precargado para la explosión
  const length = Math.floor(ctx.sampleRate * 0.5)
  noise = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return ctx
}

/** Llamar desde un gesto (clic, tecla): crea o reanuda el contexto. */
export function unlockAudio() {
  const c = context()
  if (c?.state === 'suspended') void c.resume()
}

/** Nota corta con envolvente: ataque rápido y caída exponencial. */
function tone(
  c: AudioContext,
  out: AudioNode,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = 'sine',
  endFreq = freq,
) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(1, start + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(out)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playSfx(sfx: Sfx, volume: number) {
  const c = context()
  if (!c || volume <= 0 || c.state !== 'running') return
  const out = c.createGain()
  out.gain.value = volume * 0.25
  out.connect(c.destination)
  const t = c.currentTime

  switch (sfx) {
    case 'reveal':
      tone(c, out, 520, t, 0.05, 'triangle', 380)
      break
    case 'flag':
      tone(c, out, 880, t, 0.07, 'square', 1320)
      break
    case 'explode': {
      const src = c.createBufferSource()
      const filter = c.createBiquadFilter()
      const gain = c.createGain()
      src.buffer = noise
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1800, t)
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.45)
      gain.gain.setValueAtTime(1, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
      src.connect(filter).connect(gain).connect(out)
      src.start(t)
      tone(c, out, 120, t, 0.35, 'sawtooth', 40)
      break
    }
    case 'win':
      // Arpegio mayor ascendente
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(c, out, f, t + i * 0.09, 0.18, 'triangle'),
      )
      break
  }
}

export const vibrate = (pattern: number | number[]) =>
  navigator.vibrate?.(pattern)
