import type { ReactNode } from 'react'
import { Link } from 'wouter'
import Button from '@/components/ui/Button'
import Toggle from '@/components/ui/Toggle'
import { playSfx, unlockAudio } from '@/lib/audio'
import { THEME_IDS, THEMES } from '@/lib/themes'
import type { ThemeId } from '@/lib/themes'
import { ownsTheme, usePlayerStore } from '@/store/usePlayerStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import Icon from '@/components/ui/Icon'
import IconText from '@/components/ui/IconText'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-slate-800 p-4">
      <h2 className="font-semibold">
        <IconText>{title}</IconText>
      </h2>
      {children}
    </section>
  )
}

function ThemeOption({
  id,
  selected,
  owned,
  onSelect,
}: {
  id: ThemeId
  selected: boolean
  owned: boolean
  onSelect: () => void
}) {
  const theme = THEMES[id]
  const swatches = (
    <span aria-hidden className="flex overflow-hidden rounded-md">
      {theme.swatches.map((color) => (
        <span key={color} className="size-6" style={{ background: color }} />
      ))}
    </span>
  )
  if (!owned) {
    return (
      <Link
        href="/shop"
        aria-label={`${theme.name}: bloqueado, cuesta ${theme.price} monedas en la tienda`}
        className="flex items-center gap-3 rounded-lg bg-slate-900/60 p-3 opacity-70 hover:opacity-100"
      >
        {swatches}
        <span className="flex-1 text-sm">{theme.name}</span>
        <span className="text-xs text-amber-300">
          <Icon e="🔒" /> {theme.price} <Icon e="🪙" />
        </span>
      </Link>
    )
  }
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-lg p-3 text-left ${
        selected ? 'bg-slate-700 ring-2 ring-emerald-400' : 'bg-slate-900/60'
      }`}
    >
      {swatches}
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-semibold">{theme.name}</span>
        <span className="text-xs text-slate-400">{theme.description}</span>
      </span>
    </button>
  )
}

export default function Settings() {
  const settings = useSettingsStore()
  const { update } = settings
  const player = usePlayerStore()

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-center text-2xl font-bold">Ajustes</h1>

      <Section title="🎨 Tema">
        <div role="radiogroup" aria-label="Tema" className="grid gap-2">
          {THEME_IDS.map((id) => (
            <ThemeOption
              key={id}
              id={id}
              owned={ownsTheme(player, id)}
              selected={settings.theme === id}
              onSelect={() => update({ theme: id })}
            />
          ))}
        </div>
      </Section>

      <Section title="🔊 Sonido">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle
            align="start"
            checked={settings.sound}
            onChange={(sound) => update({ sound })}
            label="Efectos de sonido"
          />
          <Button
            onClick={() => {
              unlockAudio()
              playSfx('win', settings.volume)
            }}
            disabled={!settings.sound}
          >
            <Icon e="▶" /> Probar
          </Button>
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          Volumen
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={!settings.sound}
            onChange={(e) => update({ volume: e.target.valueAsNumber })}
            className="flex-1 accent-emerald-400"
          />
          <span className="w-10 text-right font-mono tabular-nums">
            {Math.round(settings.volume * 100)}%
          </span>
        </label>
      </Section>

      <Section title="🎮 Juego">
        <div className="flex flex-col items-start gap-2">
          <Toggle
            align="start"
            checked={settings.vibration}
            onChange={(vibration) => update({ vibration })}
            label="Vibración al poner bandera y al explotar"
          />
          <Toggle
            align="start"
            checked={settings.showTimer}
            onChange={(showTimer) => update({ showTimer })}
            label="Mostrar cronómetro"
          />
          <Toggle
            align="start"
            checked={settings.animations}
            onChange={(animations) => update({ animations })}
            label="Animaciones"
            description="Si tu sistema pide reducir movimiento, se respetan igual."
          />
        </div>
      </Section>

      <Section title="♿ Accesibilidad">
        <div className="flex flex-col items-start gap-2">
          <Toggle
            align="start"
            checked={settings.colorblind}
            onChange={(colorblind) => update({ colorblind })}
            label="Modo daltonismo"
            description="Colores de números distinguibles y marcas ✓/✕ en las pistas."
          />
        </div>
        <p className="text-xs text-slate-400">
          Teclado: flechas para moverte, Enter o Espacio revela, F bandera, D
          abre alrededor de un número, R reinicia, 1–5 power-ups, Esc cancela.
        </p>
      </Section>
    </div>
  )
}
