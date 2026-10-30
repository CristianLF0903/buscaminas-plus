const CELLS = Array.from({ length: 81 }, (_, i) => i)

/** Fallback de carga de una página: título y tablero fácil (9×9) en gris. */
export default function PageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando…"
      className="flex w-full flex-col items-center gap-4 motion-safe:animate-pulse"
    >
      <div className="h-8 w-40 rounded-md bg-slate-800" />
      <div className="h-4 w-56 rounded bg-slate-800/70" />
      <div className="rounded-xl bg-slate-800 p-3">
        <div className="grid grid-cols-[repeat(9,2rem)] gap-0.5 rounded-lg bg-slate-900 p-1">
          {CELLS.map((i) => (
            <div key={i} className="size-8 rounded-sm bg-slate-700" />
          ))}
        </div>
      </div>
    </div>
  )
}
