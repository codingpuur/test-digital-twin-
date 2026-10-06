import { useIsLoggedIn } from 'common'
import { Check, X } from 'lucide-react'
import Link from 'next/link'
import { Badge, Button } from 'ui'

import { FeatureShowcase } from './FeatureShowcase'
import { AFTER_POINTS, BEFORE_POINTS, CONNECTORS, STEPS, USE_CASES } from './landing.content'
import { LandingFaq } from './LandingFaq'
import { LandingNav } from './LandingNav'
import { BrandLogo } from '@/components/ui/BrandMark'
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { BASE_PATH } from '@/lib/constants'

const PointList = ({ points, isPositive }: { points: string[]; isPositive: boolean }) => (
  <ul className="mt-6 flex flex-col gap-y-3">
    {points.map((point) => (
      <li key={point} className="flex items-start gap-x-3 text-sm text-foreground-light">
        {isPositive ? (
          <Check size={16} className="mt-0.5 shrink-0 text-brand-link" />
        ) : (
          <X size={16} className="mt-0.5 shrink-0 text-foreground-lighter" />
        )}
        <span>{point}</span>
      </li>
    ))}
  </ul>
)

export const Landing = () => {
  const isLoggedIn = useIsLoggedIn()
  const primaryHref = isLoggedIn ? '/organizations' : '/sign-up'
  const primaryLabel = isLoggedIn ? 'Open app' : 'Get started'

  return (
    <div className="min-h-screen bg-alternative text-foreground">
      <LandingNav />

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(62,207,142,0.14),transparent_65%)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 text-center">
            <p className="mb-5 inline-block rounded-full border px-3 py-1 text-xs text-foreground-light">
              {PRODUCT_TAGLINE}
            </p>
            <h1 className="mx-auto max-w-3xl text-balance text-4xl leading-tight md:text-6xl">
              Sense every pump. See the whole station.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-foreground-light">
              {PRODUCT_DESCRIPTION}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="large" variant="primary">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
              <Button asChild size="large" variant="default">
                <a href="#features">See what it does</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-foreground-lighter">
              Runs in your browser. Bring your own 3D model, or start with the demo station.
            </p>

            <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-xl border bg-surface-100 shadow-2xl">
              <img
                src={`${BASE_PATH}/img/landing/simulation.png`}
                alt={`${PRODUCT_NAME}: simulation of a storm on a pumping station`}
                width={1440}
                height={900}
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section id="use-cases" className="scroll-mt-20 border-y bg-surface-75">
          <div className="mx-auto max-w-6xl px-6 py-10 text-center">
            <p className="text-sm text-foreground-light">
              Built for pumping stations of every kind
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {USE_CASES.map((name) => (
                <span key={name} className="rounded-full border bg-surface-100 px-4 py-1.5 text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mx-auto max-w-2xl text-balance text-center text-3xl md:text-4xl">
            Stop piecing the station together from five different tools
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-surface-100 p-8">
              <h3 className="text-lg text-foreground-light">Without a digital twin</h3>
              <PointList points={BEFORE_POINTS} isPositive={false} />
            </div>
            <div className="rounded-xl border border-brand/40 bg-surface-100 p-8">
              <h3 className="text-lg">With {PRODUCT_NAME}</h3>
              <PointList points={AFTER_POINTS} isPositive />
            </div>
          </div>
        </section>

        <FeatureShowcase />

        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
          <h2 className="text-balance text-center text-3xl md:text-4xl">
            From model to live twin in four steps
          </h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-xl border bg-surface-100 p-6">
                <span className="mb-4 flex size-8 items-center justify-center rounded-full border text-sm text-brand-link">
                  {index + 1}
                </span>
                <h3 className="mb-2 text-base">{step.title}</h3>
                <p className="text-sm text-foreground-light">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="connect" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl md:text-4xl">Bring your own data</h2>
            <p className="mt-4 text-foreground-light">
              Start with the built-in simulator today. Live connectors are on the way.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CONNECTORS.map((connector) => (
              <div key={connector.name} className="rounded-xl border bg-surface-100 p-6">
                <div className="mb-2 flex items-center justify-between gap-x-3">
                  <h3 className="text-base">{connector.name}</h3>
                  <Badge variant={connector.isAvailable ? 'success' : 'default'}>
                    {connector.isAvailable ? 'Available' : 'Coming soon'}
                  </Badge>
                </div>
                <p className="text-sm text-foreground-light">{connector.description}</p>
              </div>
            ))}
          </div>
        </section>

        <LandingFaq />

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-xl border bg-surface-100 px-6 py-16 text-center">
            <h2 className="text-balance text-3xl md:text-4xl">Ready to see your station run?</h2>
            <p className="mx-auto mt-4 max-w-xl text-foreground-light">
              Create an account, add a site and open the demo station. It takes a couple of minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="large" variant="primary">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
              {!isLoggedIn && (
                <Button asChild size="large" variant="default">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <BrandLogo size={24} />
            <p className="mt-4 max-w-xs text-sm text-foreground-light">{PRODUCT_TAGLINE}</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm">Product</h4>
            <ul className="flex flex-col gap-y-2 text-sm text-foreground-light">
              <li>
                <a href="#features" className="hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground">
                  How it works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm">Account</h4>
            <ul className="flex flex-col gap-y-2 text-sm text-foreground-light">
              <li>
                <Link href="/sign-in" className="hover:text-foreground">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="hover:text-foreground">
                  Get started
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <p className="mx-auto max-w-6xl px-6 py-6 text-xs text-foreground-lighter">
            © {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
