import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

const PIECES = 48
const DURATION_MS = 2600
const COLORS = ['#34d399', '#fbbf24', '#38bdf8', '#f472b6', '#a78bfa']

/** Confeti al ganar. Se desmonta solo; no captura clics. */
export default function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: PIECES }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 400,
      drift: (Math.random() - 0.5) * 30,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
    })),
  )
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  if (done) return null
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-sm"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.5,
              background: p.color,
              '--drift': `${p.drift}vw`,
              animation: `confetti-fall ${DURATION_MS - 400}ms ease-in ${p.delay}ms both`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
