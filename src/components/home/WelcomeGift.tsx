import { useState } from 'react'
import { Link } from 'wouter'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { STARTER_GIFT } from '@/lib/economy/starterGift'
import { POWER_UPS } from '@/lib/powerups/catalog'
import type { PowerUpId } from '@/lib/powerups/ids'
import { usePlayerStore } from '@/store/usePlayerStore'

// Espacio no separable: cada ítem del regalo queda en una sola línea
const NBSP = '\u00a0'

/** "1 💡 Pista, 1 📡 Radar y 30 🪙" a partir de las constantes del regalo. */
function giftText(): string {
  const parts = Object.entries(STARTER_GIFT.powerUps).map(([id, n]) => {
    const def = POWER_UPS[id as PowerUpId]
    return `${n}${NBSP}${def.icon}${NBSP}${def.name}`
  })
  return `${parts.join(', ')} y ${STARTER_GIFT.coins}${NBSP}🪙`
}

/** Banner de la primera visita: regalo para probar los power-ups. */
export default function WelcomeGift() {
  const claimed = usePlayerStore((s) => s.starterGiftClaimed)
  const claim = usePlayerStore((s) => s.claimStarterGift)
  // Tras reclamar se muestra la confirmación hasta salir del menú
  const [justClaimed, setJustClaimed] = useState(false)

  if (claimed && !justClaimed) return null

  return (
    <div
      role="region"
      aria-label="Regalo de bienvenida"
      className="flex flex-col items-center gap-3 rounded-xl bg-amber-400/10 p-4 text-center ring-1 ring-amber-400/40 sm:flex-row sm:text-left"
    >
      <span className="text-4xl" aria-hidden>
        🎁
      </span>
      {justClaimed ? (
        <>
          <p className="flex-1 text-amber-100" aria-live="polite">
            ¡Listo! Ya tienes {giftText()}. Úsalos desde la barra bajo el
            tablero.
          </p>
          <Link href="/shop" className={buttonClass('secondary')}>
            🛒 Ver tienda
          </Link>
        </>
      ) : (
        <>
          <p className="flex-1 text-amber-100">
            <b>¡Bienvenido!</b> Te regalamos {giftText()} para empezar.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              if (claim()) setJustClaimed(true)
            }}
          >
            Reclamar
          </Button>
        </>
      )}
    </div>
  )
}
