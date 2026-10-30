// Genera src/components/ui/icons.generated.ts con los SVG de Fluent Emoji
// Flat (Microsoft, licencia MIT) que usa la app. Solo se copian los iconos
// listados: el set completo pesa varios MB.
// Uso: npm run icons
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const set = JSON.parse(
  readFileSync(
    require.resolve('@iconify-json/fluent-emoji-flat/icons.json'),
    'utf8',
  ),
)

/** Emoji (sin el selector U+FE0F) → nombre del icono en Fluent Emoji Flat. */
const MAP = {
  '🚩': 'triangular-flag',
  '🎀': 'ribbon',
  '💣': 'bomb',
  '💥': 'collision',
  '🪙': 'coin',
  '✅': 'check-mark-button',
  '❌': 'cross-mark',
  '💡': 'light-bulb',
  '⏳': 'hourglass-not-done',
  '🔍': 'magnifying-glass-tilted-left',
  '📡': 'satellite-antenna',
  '🛡': 'shield',
  '🔥': 'fire',
  '🏆': 'trophy',
  '👑': 'crown',
  '🧩': 'puzzle-piece',
  '🛒': 'shopping-cart',
  '🙂': 'slightly-smiling-face',
  '😎': 'smiling-face-with-sunglasses',
  '😵': 'knocked-out-face',
  '⏱': 'stopwatch',
  '📅': 'calendar',
  '♾': 'infinity',
  '🔒': 'locked',
  '🎨': 'artist-palette',
  '🎁': 'wrapped-gift',
  '🧠': 'brain',
  '🧱': 'brick',
  '🔷': 'large-blue-diamond',
  '🔵': 'blue-circle',
  '🌫': 'fog',
  '🔄': 'counterclockwise-arrows-button',
  '🚧': 'construction',
  '📊': 'bar-chart',
  '⚙': 'gear',
  '🎯': 'bullseye',
  '🔊': 'speaker-high-volume',
  '▶': 'play-button',
  '🎮': 'video-game',
  '♿': 'wheelchair-symbol',
  '⬇': 'down-arrow',
  '⬆': 'up-arrow',
  '🗑': 'wastebasket',
  '⭐': 'star',
}

const out = {}
for (const [emoji, name] of Object.entries(MAP)) {
  const icon = set.icons[name]
  if (!icon) throw new Error(`No existe el icono ${name}`)
  if (/\sid=/.test(icon.body))
    throw new Error(`${name} usa ids: no es seguro repetirlo`)
  out[emoji] = icon.body
}

const file = `// Generado por scripts/build-icons.mjs. No editar a mano.
// Fluent Emoji Flat, © Microsoft Corporation, licencia MIT:
// https://github.com/microsoft/fluentui-emoji

/** Emoji (sin U+FE0F) → contenido SVG de 32×32. */
export const ICONS: Record<string, string> = ${JSON.stringify(out, null, 2)}
`
writeFileSync('src/components/ui/icons.generated.ts', file)
console.log(`${Object.keys(out).length} iconos`)
