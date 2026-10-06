import { useIsLoggedIn } from 'common'
import Link from 'next/link'
import { Button } from 'ui'

import { BrandLogo } from '@/components/ui/BrandMark'
import { PRODUCT_NAME } from '@/lib/brand'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#use-cases', label: 'Use cases' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#faq', label: 'FAQ' },
]

export const LandingNav = () => {
  const isLoggedIn = useIsLoggedIn()

  return (
    <header className="sticky top-0 z-20 border-b bg-alternative/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label={PRODUCT_NAME}>
          <BrandLogo size={28} />
        </Link>
        <div className="hidden items-center gap-x-8 text-sm text-foreground-light md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-x-2">
          {!isLoggedIn && (
            <Button asChild variant="default">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
          <Button asChild variant="primary">
            <Link href={isLoggedIn ? '/organizations' : '/sign-up'}>
              {isLoggedIn ? 'Open app' : 'Get started'}
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
