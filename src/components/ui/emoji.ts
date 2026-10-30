/** Un emoji con su selector de variación opcional. */
export const EMOJI = /(\p{Extended_Pictographic}\uFE0F?)/u

/** Quita el selector de variación: con o sin él, el emoji es el mismo icono. */
export const iconKey = (emoji: string) => emoji.replace(/\uFE0F/g, '')

/** Texto sin emojis, para `aria-label` (los iconos son decorativos). */
export const stripEmoji = (text: string) =>
  text.replace(/\p{Extended_Pictographic}\uFE0F?\s*/gu, '').trim()
