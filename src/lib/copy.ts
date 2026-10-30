/**
 * Textos visibles del modo sin adivinar. Internamente sigue siendo `noGuess`;
 * de cara al jugador se llama "Lógica pura".
 */

/** Toggles. */
export const LOGIC_LABEL = '🧠 Lógica pura'

/** Ayuda bajo el toggle. */
export const LOGIC_HELP = 'Siempre hay una jugada segura. Nunca un 50/50.'

/** Subtítulos (en minúscula, tras un "·"). */
export const LOGIC_TAG = 'lógica pura'

export const HOME_TAGLINE = 'Pura lógica. Cero suerte. Con power-ups.'

/** No se encontró un tablero resoluble solo con lógica. */
export const LOGIC_FALLBACK =
  'Este tablero puede requerir suerte: no encontramos uno 100% lógico con esta densidad.'
