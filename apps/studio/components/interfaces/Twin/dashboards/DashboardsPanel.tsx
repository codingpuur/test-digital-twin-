import { useParams } from 'common'
import { LayoutDashboard, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Button } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { CreateDashboardDialog } from './CreateDashboardDialog'
import { useDashboards } from './useDashboards'

export const DashboardsPanel = () => {
  const router = useRouter()
  const { ref } = useParams()
  const siteRef = ref ?? ''
  const { dashboards, addDashboard, deleteDashboard } = useDashboards(siteRef)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="flex flex-col gap-y-3">
      <Button variant="default" icon={<Plus size={14} />} onClick={() => setIsCreating(true)}>
        Create dashboard
      </Button>

      {dashboards.length === 0 && (
        <EmptyStatePresentational
          icon={LayoutDashboard}
          title="No dashboards created yet"
          description="Dashboards show live values from your streams."
        />
      )}

      {/* The route param is not known on the very first render; links would get an empty site. */}
      {siteRef &&
        dashboards.map((dashboard) => (
          <div
            key={dashboard.id}
            className="group flex items-center gap-x-2 rounded-md border bg-surface-100 px-3 py-2 hover:border-foreground-muted"
          >
            <Link
              href={`/project/${siteRef}/dashboards/${dashboard.id}`}
              className="flex min-w-0 flex-1 flex-col"
            >
              <span className="truncate text-sm">{dashboard.name}</span>
              <span className="text-xs text-foreground-lighter">
                {dashboard.cards.length} {dashboard.cards.length === 1 ? 'card' : 'cards'}
              </span>
            </Link>
            <Button
              variant="text"
              size="tiny"
              aria-label={`Delete ${dashboard.name}`}
              className="opacity-0 group-hover:opacity-100"
              icon={<Trash2 size={14} />}
              onClick={() => deleteDashboard(dashboard.id)}
            />
          </div>
        ))}

      <CreateDashboardDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onCreate={(values) => {
          const dashboard = addDashboard(values)
          setIsCreating(false)
          router.push(`/project/${siteRef}/dashboards/${dashboard.id}`)
        }}
      />
    </div>
  )
}
