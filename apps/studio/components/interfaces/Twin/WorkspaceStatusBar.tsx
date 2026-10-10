import { PanelRight } from 'lucide-react'
import { cn } from 'ui'

import { ButtonTooltip } from '@/components/ui/ButtonTooltip'

type WorkspaceStatusBarProps = {
  modelName: string
  elementCount: number
  isPropertiesOpen: boolean
  onToggleProperties: () => void
}

/** The strip along the bottom of the workspace: what is loaded, and the Properties panel toggle. */
export const WorkspaceStatusBar = ({
  modelName,
  elementCount,
  isPropertiesOpen,
  onToggleProperties,
}: WorkspaceStatusBarProps) => (
  <div className="flex h-9 shrink-0 items-center justify-between border-t bg-surface-100 px-3">
    <p className="truncate text-xs text-foreground-lighter">
      {modelName} · {elementCount} elements
    </p>
    <ButtonTooltip
      variant="text"
      size="tiny"
      aria-label={isPropertiesOpen ? 'Hide properties' : 'Show properties'}
      aria-pressed={isPropertiesOpen}
      className={cn('px-1.5', isPropertiesOpen && 'text-brand')}
      icon={<PanelRight size={16} />}
      onClick={onToggleProperties}
      tooltip={{
        content: { side: 'top', text: isPropertiesOpen ? 'Hide properties' : 'Show properties' },
      }}
    />
  </div>
)
