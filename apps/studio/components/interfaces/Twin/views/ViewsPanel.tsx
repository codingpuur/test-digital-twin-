import {
  ChevronDown,
  ChevronRight,
  ImageIcon,
  LayoutGrid,
  List,
  MoreVertical,
  X,
} from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from 'ui'
import { ConfirmationModal } from 'ui-patterns/Dialogs/ConfirmationModal'

import { useDashboards } from '../dashboards/useDashboards'
import { SaveViewDialog } from './SaveViewDialog'
import type { TwinView } from './views.types'
import { filterViews, splitByDashboards, uniqueViewName } from './views.utils'

type Layout = 'gallery' | 'list'

type ViewsPanelProps = {
  views: TwinView[]
  activeViewId: string | null
  siteRef: string
  onSave: () => void
  onSaveAs: (name: string) => void
  onApply: (view: TwinView) => void
  onUpdate: (view: TwinView) => void
  onRename: (view: TwinView, name: string) => void
  onDelete: (view: TwinView) => void
  onClose: () => void
}

type Dialog = { kind: 'save-as' } | { kind: 'rename'; view: TwinView } | null

const ViewMenu = ({
  view,
  onRename,
  onUpdate,
  onDelete,
}: {
  view: TwinView
  onRename: () => void
  onUpdate: () => void
  onDelete: () => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="text"
        size="tiny"
        className="size-5 px-0"
        aria-label={`Options for ${view.name}`}
        icon={<MoreVertical size={12} />}
        onClick={(event) => event.stopPropagation()}
      />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
      <DropdownMenuItem onClick={onUpdate}>Update to current view</DropdownMenuItem>
      <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

/** Saved camera positions and filters, shown over the 3D view like Tandem's Views panel. */
export const ViewsPanel = ({
  views,
  activeViewId,
  siteRef,
  onSave,
  onSaveAs,
  onApply,
  onUpdate,
  onRename,
  onDelete,
  onClose,
}: ViewsPanelProps) => {
  // Read when the panel opens, so a dashboard made a moment ago is already counted.
  const { dashboards } = useDashboards(siteRef)
  const dashboardViewIds = new Set(
    dashboards.flatMap((dashboard) => (dashboard.viewId ? [dashboard.viewId] : []))
  )
  const [layout, setLayout] = useState<Layout>('gallery')
  const [search, setSearch] = useState('')
  const [isDashboardGroupOpen, setIsDashboardGroupOpen] = useState(true)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [viewToDelete, setViewToDelete] = useState<TwinView | null>(null)

  const { fromDashboards, others } = splitByDashboards(filterViews(views, search), dashboardViewIds)
  const activeView = views.find((view) => view.id === activeViewId) ?? null

  const renderView = (view: TwinView) => {
    const menu = (
      <ViewMenu
        view={view}
        onRename={() => setDialog({ kind: 'rename', view })}
        onUpdate={() => onUpdate(view)}
        onDelete={() => setViewToDelete(view)}
      />
    )
    const isActive = view.id === activeViewId

    if (layout === 'list') {
      return (
        <div
          key={view.id}
          role="button"
          tabIndex={0}
          onClick={() => onApply(view)}
          onKeyDown={(event) => event.key === 'Enter' && onApply(view)}
          className={cn(
            'flex cursor-pointer items-center gap-x-2 rounded-md border p-1.5 hover:border-foreground-muted',
            isActive && 'border-brand'
          )}
        >
          <img
            src={view.thumbnail}
            alt=""
            className="h-9 w-16 rounded-sm bg-surface-300 object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-xs">{view.name}</span>
          {menu}
        </div>
      )
    }
    return (
      <div
        key={view.id}
        role="button"
        tabIndex={0}
        onClick={() => onApply(view)}
        onKeyDown={(event) => event.key === 'Enter' && onApply(view)}
        className={cn(
          'cursor-pointer overflow-hidden rounded-md border bg-surface-200 hover:border-foreground-muted',
          isActive && 'border-brand'
        )}
      >
        <img src={view.thumbnail} alt={view.name} className="aspect-video w-full object-cover" />
        <div className="flex items-center justify-between gap-x-1 px-1.5 py-1">
          <span className="min-w-0 truncate text-xs text-brand">{view.name}</span>
          {menu}
        </div>
      </div>
    )
  }

  const renderGroup = (items: TwinView[]) => (
    <div className={layout === 'gallery' ? 'grid grid-cols-3 gap-1.5' : 'flex flex-col gap-1.5'}>
      {items.map(renderView)}
    </div>
  )

  return (
    <div className="absolute right-3 top-3 z-20 flex max-h-[calc(100%-24px)] w-72 flex-col rounded-lg border bg-surface-100/95 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs uppercase tracking-wide">Views</h2>
        <Button
          variant="text"
          size="tiny"
          aria-label="Close views"
          icon={<X size={14} />}
          onClick={onClose}
        />
      </div>

      <div className="flex flex-col gap-y-2 p-3">
        <p className="truncate text-xs text-foreground-light">
          {activeView ? activeView.name : 'No view applied'}
        </p>
        <div className="flex gap-x-2">
          <Button
            size="tiny"
            variant="primary"
            className="flex-1"
            // Saving with no view applied makes a new one; otherwise it overwrites the active view.
            onClick={() => (activeView ? onSave() : setDialog({ kind: 'save-as' }))}
          >
            Save
          </Button>
          <Button
            size="tiny"
            variant="default"
            className="flex-1"
            onClick={() => setDialog({ kind: 'save-as' })}
          >
            Save As…
          </Button>
        </div>
        <div className="flex gap-x-1 border-b">
          {(
            [
              { id: 'list', label: 'List', icon: <List size={12} /> },
              { id: 'gallery', label: 'Gallery', icon: <LayoutGrid size={12} /> },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLayout(item.id)}
              className={cn(
                'flex items-center gap-x-1 border-b-2 px-2 py-1 text-xs',
                layout === item.id
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-foreground-light hover:text-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        <Input
          size="tiny"
          placeholder="Search views…"
          aria-label="Search views"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-y-2 overflow-y-auto px-3 pb-3">
        {views.length === 0 && (
          <div className="flex flex-col items-center gap-y-1 py-6 text-center text-xs text-foreground-lighter">
            <ImageIcon size={20} />
            <p>No saved views yet.</p>
            <p>Move the camera, then press Save As.</p>
          </div>
        )}

        {fromDashboards.length > 0 && (
          <div className="flex flex-col gap-y-1.5">
            <button
              type="button"
              className="flex items-center gap-x-1 text-xs text-foreground-light"
              onClick={() => setIsDashboardGroupOpen((previous) => !previous)}
            >
              {isDashboardGroupOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Views from dashboards ({fromDashboards.length})
            </button>
            {isDashboardGroupOpen && renderGroup(fromDashboards)}
          </div>
        )}

        {others.length > 0 && renderGroup(others)}

        {views.length > 0 && fromDashboards.length + others.length === 0 && (
          <p className="py-4 text-center text-xs text-foreground-lighter">
            No views match “{search}”.
          </p>
        )}
      </div>

      <SaveViewDialog
        open={dialog !== null}
        title={dialog?.kind === 'rename' ? 'Rename view' : 'Save view as'}
        confirmLabel={dialog?.kind === 'rename' ? 'Rename' : 'Save'}
        initialName={
          dialog?.kind === 'rename' ? dialog.view.name : uniqueViewName('Facility View', views)
        }
        onOpenChange={(open) => !open && setDialog(null)}
        onSubmit={(name) => {
          if (dialog?.kind === 'rename') onRename(dialog.view, name)
          else onSaveAs(name)
          setDialog(null)
        }}
      />

      <ConfirmationModal
        visible={viewToDelete !== null}
        title={`Delete “${viewToDelete?.name}”?`}
        description="Dashboards that use this view fall back to all twin data."
        confirmLabel="Delete view"
        onCancel={() => setViewToDelete(null)}
        onConfirm={() => {
          if (viewToDelete) onDelete(viewToDelete)
          setViewToDelete(null)
        }}
      />
    </div>
  )
}
