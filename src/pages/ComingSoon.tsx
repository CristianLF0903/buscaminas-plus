import { Link } from 'wouter'
import { buttonClass } from '@/components/ui/buttonStyles'
import Icon from '@/components/ui/Icon'

export default function ComingSoon({ title }: { title: string }) {
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="text-5xl" aria-hidden>
        <Icon e="🚧" />
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-slate-400">Próximamente.</p>
      <Link href="/" className={buttonClass('secondary')}>
        Volver al menú
      </Link>
    </section>
  )
}
