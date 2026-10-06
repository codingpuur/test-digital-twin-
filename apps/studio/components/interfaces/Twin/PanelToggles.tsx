import { Maximize2, PanelBottom, PanelLeft, PanelRight } from 'lucide-react'
import { cn } from 'ui'

import type { CollapsiblePanel } from './useCollapsiblePanel'
import { ButtonTooltip } from '@/components/ui/ButtonTooltip'

type PanelTogglesProps = {
  left: CollapsiblePanel
  right: CollapsiblePanel
  bottom: CollapsiblePanel
}

/** Show or hide the side panels and the bottom drawer; "Focus 3D" hides all three at once. */
export const PanelToggles = ({ left, right, bottom }: PanelTogglesProps) => {
  const panels = [left, right, bottom]
  const isFocused = panels.every((panel) => panel.isCollapsed)

  const handleFocus = () =>
    panels.forEach((panel) => (isFocused ? panel.expand() : panel.collapse()))

  const items = [
    { label: 'left panel', icon: PanelLeft, panel: left },
    { label: 'bottom panel', icon: PanelBottom, panel: bottom },
    { label: 'properties panel', icon: PanelRight, panel: right },
  ]

  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-x-1 rounded-md border bg-surface-100/90 p-1">
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
