export const POWER_UP_IDS = [
  'radar',
  'shield',
  'detector',
  'timePlus',
  'hint',
] as const

export type PowerUpId = (typeof POWER_UP_IDS)[number]
