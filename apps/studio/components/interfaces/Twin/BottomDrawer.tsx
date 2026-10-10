import { X } from 'lucide-react'
import { useRef, type PointerEvent, type ReactNode } from 'react'
import { Button, cn } from 'ui'

const MIN_HEIGHT = 160
/** Never cover more than this share of the 3D view, so there is always something to orbit. */
const MAX_HEIGHT_RATIO = 0.8

type BottomDrawerProps = {
  isOpen: boolean
  height: number
  onHeightChange: (height: number) => void
  tabs: { id: string; label: string }[]
  activeTab: string
  onTabChange: (id: string) => void
  onClose: () => void
  children: ReactNode
}

/**
 * A drawer laid over the bottom of the 3D view (position: absolute), not beside it, so opening it
 * never resizes the canvas. The tab bar is solid; the body is slightly see-through.
 */
export const BottomDrawer = ({
  isOpen,
  height,
  onHeightChange,
  tabs,
  activeTab,
  onTabChange,
  onClose,
  children,
}: BottomDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startHeight: number } | null>(null)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startY: event.clientY, startHeight: height }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const available = drawerRef.current?.parentElement?.clientHeight ?? 600
    const next = drag.current.startHeight + (drag.current.startY - event.clientY)
    onHeightChange(Math.round(Math.min(available * MAX_HEIGHT_RATIO, Math.max(MIN_HEIGHT, next))))
  }

  return (
    <div
      ref={drawerRef}
      aria-hidden={!isOpen}
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 flex max-h-[80%] flex-col border-t shadow-2xl transition-transform duration-200',
        isOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      )}
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize drawer"
        className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      />
      <div className="flex items-center justify-between border-b bg-surface-100 px-3">
        <div className="flex gap-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'border-b-2 px-3 py-2 text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-foreground-light hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button
          variant="text"
          size="tiny"
          aria-label="Close drawer"
          icon={<X size={14} />}
          onClick={onClose}
        />
      </div>
      <div className="min-h-0 flex-1 bg-surface-100/85">{children}</div>
    </div>
  )
}
