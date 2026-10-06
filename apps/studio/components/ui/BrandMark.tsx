import { cn } from 'ui'

import { PRODUCT_NAME } from '@/lib/brand'

/** The product mark: a hexagon (the twin) with a wave (the live water) inside. */
export const BrandMark = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    fill="none"
    role="img"
    aria-label={PRODUCT_NAME}
    className={className}
  >
    <path
      d="M16 2.5 28 9.25v13.5L16 29.5 4 22.75V9.25L16 2.5Z"
      stroke="#3ecf8e"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 17c2.2-3 4.3-3 6.5 0s4.3 3 6.5 0 1.7-2.5 2.5-3.2"
      stroke="#3ecf8e"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="16" cy="9.5" r="1.7" fill="#3ecf8e" />
  </svg>
)

/** Mark plus product name, for headers and auth screens. */
export const BrandLogo = ({
  className,
  size = 24,
  showName = true,
}: {
  className?: string
  size?: number
  showName?: boolean
}) => (
  <span className={cn('inline-flex items-center gap-x-2', className)}>
    <BrandMark size={size} />
    {showName && <span className="text-foreground font-medium tracking-tight">{PRODUCT_NAME}</span>}
  </span>
)
