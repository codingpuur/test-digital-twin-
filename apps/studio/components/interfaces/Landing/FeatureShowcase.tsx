import { Check } from 'lucide-react'

import { FEATURE_ROWS, type FeatureRow } from './landing.content'
import { BASE_PATH } from '@/lib/constants'

const Screenshot = ({ src, alt }: { src: string; alt: string }) => (
  <div className="overflow-hidden rounded-xl border bg-surface-100 shadow-2xl">
    <img
      src={`${BASE_PATH}${src}`}
      alt={alt}
      width={1440}
      height={900}
      loading="lazy"
      className="h-auto w-full"
    />
  </div>
)

const FeatureBlock = ({ row, isReversed }: { row: FeatureRow; isReversed: boolean }) => (
  <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
    <div className={isReversed ? 'lg:order-2' : undefined}>
      <p className="mb-3 text-sm text-brand-link">{row.eyebrow}</p>
      <h3 className="text-balance text-2xl md:text-3xl">{row.title}</h3>
      <p className="mt-4 text-foreground-light">{row.description}</p>
      <ul className="mt-6 flex flex-col gap-y-3">
        {row.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-x-3 text-sm text-foreground-light">
            <Check size={16} className="mt-0.5 shrink-0 text-brand-link" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className={isReversed ? 'lg:order-1' : undefined}>
      <Screenshot src={row.image} alt={row.imageAlt} />
    </div>
  </div>
)

export const FeatureShowcase = () => (
  <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
    <div className="mx-auto mb-16 max-w-2xl text-center">
      <h2 className="text-balance text-3xl md:text-4xl">Everything you need to run the station</h2>
      <p className="mt-4 text-foreground-light">
        From the first model upload to what-if simulations, in one place.
      </p>
    </div>
    <div className="flex flex-col gap-y-24">
      {FEATURE_ROWS.map((row, index) => (
        <FeatureBlock key={row.id} row={row} isReversed={index % 2 === 1} />
      ))}
    </div>
  </section>
)
