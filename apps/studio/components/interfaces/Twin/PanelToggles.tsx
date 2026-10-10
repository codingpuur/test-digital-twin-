import { Images, Maximize2, PanelBottom, PanelLeft } from 'lucide-react'
import { cn } from 'ui'

import { ButtonTooltip } from '@/components/ui/ButtonTooltip'

/** What the toggle needs from a panel or drawer. */
type Toggleable = {
  isCollapsed: boolean
  toggle: () => void
  collapse: () => void
  expand: () => void
}

type PanelTogglesProps = {
  left: Toggleable
  bottom: Toggleable
  /** Distance from the bottom of the view, so the toolbar sits above an open drawer. */
  bottomOffset: number
  /** Without these the Views button is left out (a workspace with no saved views). */
  isViewsOpen?: boolean
  onToggleViews?: () => void
}

/** Show or hide the side panels and the bottom drawer; "Focus 3D" hides all three at once. */
export const PanelToggles = ({
  left,
  bottom,
  bottomOffset,
  isViewsOpen = false,
  onToggleViews,
}: PanelTogglesProps) => {
  const panels = [left, bottom]
  const isFocused = panels.every((panel) => panel.isCollapsed)

  const handleFocus = () =>
    panels.forEach((panel) => (isFocused ? panel.expand() : panel.collapse()))

  const items = [
    { label: 'left panel', icon: PanelLeft, panel: left },
    { label: 'bottom panel', icon: PanelBottom, panel: bottom },
  ]

  return (
    <div
      style={{ bottom: bottomOffset }}
      className="absolute right-3 z-30 flex items-center gap-x-1 rounded-md border bg-surface-100/90 p-1"
    >
      {items.map(({ label, icon: Icon, panel }) => (
        <ButtonTooltip
          key={label}
          variant="text"
          size="tiny"
          aria-label={`${panel.isCollapsed ? 'Show' : 'Hide'} ${label}`}
          className={cn('px-1.5', !panel.isCollapsed && 'text-foreground')}
          icon={<Icon size={14} className={cn(panel.isCollapsed && 'opacity-50')} />}
          onClick={panel.toggle}
          tooltip={{
            content: { side: 'bottom', text: `${panel.isCollapsed ? 'Show' : 'Hide'} ${label}` },
          }}
        />
      ))}
      {onToggleViews && (
        <ButtonTooltip
          variant="text"
          size="tiny"
          aria-label={isViewsOpen ? 'Hide views' : 'Show views'}
          className={cn('px-1.5', isViewsOpen && 'text-brand')}
          icon={<Images size={14} />}
          onClick={onToggleViews}
          tooltip={{ content: { side: 'top', text: 'Views' } }}
        />
      )}
      <ButtonTooltip
        variant="text"
        size="tiny"
        aria-label={isFocused ? 'Show all panels' : 'Focus 3D view'}
        className="px-1.5"
        icon={<Maximize2 size={14} />}
        onClick={handleFocus}
        tooltip={{
          content: { side: 'bottom', text: isFocused ? 'Show all panels' : 'Focus 3D view' },
        }}
      />
    </div>
  )
}
