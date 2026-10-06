import { useIsLoggedIn } from 'common'
import {
  Activity,
  Box,
  CirclePlay,
  Gauge,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from 'ui'

import { BrandLogo } from '@/components/ui/BrandMark'
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { BASE_PATH } from '@/lib/constants'

type Feature = { icon: ReactNode; title: string; description: string }

const FEATURES: Feature[] = [
  {
    icon: <Box size={20} strokeWidth={1.5} />,
    title: '3D model and inventory',
    description:
      'Upload a GLB, glTF or IFC model. Every element becomes a row in a searchable inventory that stays in sync with the 3D view.',
  },
  {
    icon: <Activity size={20} strokeWidth={1.5} />,
    title: 'Live data and replay',
    description:
      'See pumps, levels and pressures as they run, then scrub the timeline to replay any moment and see what the station looked like.',
  },
  {
    icon: <LayoutDashboard size={20} strokeWidth={1.5} />,
    title: 'Dashboards',
    description:
      'Build dashboards from cards: values, gauges, charts and tables. Start blank or from a pumping station template.',
  },
  {
    icon: <CirclePlay size={20} strokeWidth={1.5} />,
    title: 'Simulation',
    description:
      'Try a storm, a pump trip or a closed valve before it happens. Compare the simulated run with what actually occurred.',
  },
  {
    icon: <SlidersHorizontal size={20} strokeWidth={1.5} />,
    title: 'Animation bindings',
    description:
      'Link any signal to any part: spin an impeller, move water, turn a valve, flash a warning. No code needed.',
  },
  {
    icon: <ShieldCheck size={20} strokeWidth={1.5} />,
    title: 'Sites and teams',
    description:
      'One account for every station. Invite your team and give each person the access they need.',
  },
]

const STEPS = [
  { icon: <Box size={18} />, title: 'Create a site', description: 'Name your pumping station.' },
  { icon: <Upload size={18} />, title: 'Upload your model', description: 'Drop in a GLB or IFC file.' },
  { icon: <Gauge size={18} />, title: 'Connect your data', description: 'Link live signals to assets.' },
  { icon: <Activity size={18} />, title: 'Monitor and simulate', description: 'Watch it run, replay it, test changes.' },
]

export const Landing = () => {
  const isLoggedIn = useIsLoggedIn()
  const primaryHref = isLoggedIn ? '/organizations' : '/sign-up'
  const primaryLabel = isLoggedIn ? 'Open app' : 'Get started'

  return (
    <div className="min-h-screen bg-alternative text-foreground">
      <header className="sticky top-0 z-10 border-b bg-alternative/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label={PRODUCT_NAME}>
            <BrandLogo size={28} />
          </Link>
          <div className="hidden items-center gap-x-8 text-sm text-foreground-light md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground">
              How it works
            </a>
          </div>
          <div className="flex items-center gap-x-2">
            {!isLoggedIn && (
              <Button asChild variant="default">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
            <Button asChild variant="primary">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
          <p className="mb-4 inline-block rounded-full border px-3 py-1 text-xs text-foreground-light">
            {PRODUCT_TAGLINE}
          </p>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl leading-tight md:text-6xl">
            Your pumping station, as a live digital twin
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-foreground-light">
            {PRODUCT_DESCRIPTION}
          </p>
          <div className="mt-8 flex items-center justify-center gap-x-3">
            <Button asChild size="large" variant="primary">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            <Button asChild size="large" variant="default">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-xl border bg-surface-100 shadow-2xl">
            <img
              src={`${BASE_PATH}/img/landing/workspace.png`}
              alt={`The ${PRODUCT_NAME} workspace: 3D model, inventory, timeline and properties`}
              className="w-full"
            />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl">Everything you need to run the station</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-lg border bg-surface-100 p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-md border bg-surface-200 text-brand-link">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg">{feature.title}</h3>
                <p className="text-sm text-foreground-light">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl">From model to live twin in four steps</h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-lg border bg-surface-100 p-6">
                <span className="mb-4 flex size-8 items-center justify-center rounded-full border text-sm text-brand-link">
                  {index + 1}
                </span>
                <h3 className="mb-1 flex items-center gap-x-2 text-base">
                  {step.icon}
                  {step.title}
                </h3>
                <p className="text-sm text-foreground-light">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-xl border bg-surface-100 px-6 py-14 text-center">
            <h2 className="text-3xl">Ready to see your station run?</h2>
            <p className="mx-auto mt-3 max-w-xl text-foreground-light">
              Create an account, add a site and upload your model. It takes a few minutes.
            </p>
            <div className="mt-6">
              <Button asChild size="large" variant="primary">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-y-3 px-6 py-8 text-sm text-foreground-lighter md:flex-row">
          <BrandLogo size={20} />
          <p>
            © {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
