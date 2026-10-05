import { useParams } from 'common'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { AddCardDialog } from './AddCardDialog'
import { DashboardCardView } from './DashboardCardView'
import {
  DATE_RANGES,
  type Dashboard,
  type DashboardCard,
  type DateRangeId,
} from './dashboards.types'
import { createDashboardId, useDashboards } from './useDashboards'

const LAYOUTS = [
  { value: '1', label: '1 column', className: 'grid-cols-1' },
  { value: '2', label: '2 columns', className: 'grid-cols-1 lg:grid-cols-2' },
  { value: '3', label: '3 columns', className: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' },
]

export const DashboardEditor = () => {
  const router = useRouter()
  const { ref, id } = useParams()
  const siteRef = ref ?? ''
  const { dashboards, saveDashboard, addDashboard } = useDashboards(siteRef)

  const saved = dashboards.find((item) => item.id === id)
  const [draft, setDraft] = useState<Dashboard | null>(null)
  const [rangeId, setRangeId] = useState<DateRangeId>('7d')
  const [layout, setLayout] = useState('2')
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Live readings: refresh the clock every few seconds.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  const dashboard = draft ?? saved ?? null
  const siteUrl = `/project/${siteRef}?module=dashboards`
  const gridClassName = LAYOUTS.find((item) => item.value === layout)?.className ?? ''
  const hasChanges = !!draft

  if (!dashboard) {
    return (
      <div className="p-8">
        <EmptyStatePresentational
          title="Dashboard not found"
          description="It may have been deleted, or it lives in another browser."
        >
          <Button asChild variant="default">
            <Link href={siteUrl}>Back to site</Link>
          </Button>
        </EmptyStatePresentational>
      </div>
    )
  }

  const updateCards = (cards: DashboardCard[]) => setDraft({ ...dashboard, cards })

  const handleSave = () => {
    saveDashboard(dashboard)
    setDraft(null)
    toast.success('Dashboard saved')
  }

  const handleSaveAsNew = () => {
    const copy = addDashboard({
      name: `${dashboard.name} copy`,
      description: dashboard.description,
      template: 'blank',
    })
    saveDashboard({ ...dashboard, id: copy.id, name: copy.name })
    toast.success('Saved as a new dashboard')
    router.push(`/project/${siteRef}/dashboards/${copy.id}`)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-x-4 border-b px-4 py-3">
        <Link
          href={siteUrl}
          className="flex items-center gap-x-2 text-sm text-foreground-light hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to site
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-sm">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-xs text-foreground-lighter">{dashboard.description}</p>
          )}
        </div>
        <div className="flex items-center gap-x-2">
          <Button variant="primary" disabled={!hasChanges} onClick={handleSave}>
            Save
          </Button>
          <Button variant="default" onClick={handleSaveAsNew}>
            Save as new
          </Button>
          <Button variant="outline" onClick={() => router.push(siteUrl)}>
            Leave edit
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <Select value={rangeId} onValueChange={(value) => setRangeId(value as DateRangeId)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((range) => (
              <SelectItem key={range.id} value={range.id}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="default">All twin data</Badge>
        <div className="flex-1" />
        <Select value={layout} onValueChange={setLayout}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LAYOUTS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                Layout: {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setIsAddingCard(true)}>
          Add a card
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {dashboard.cards.length === 0 && (
          <EmptyStatePresentational
            title="No content"
            description="Add a card to show live values from your streams."
          >
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setIsAddingCard(true)}>
              Add a card
            </Button>
          </EmptyStatePresentational>
        )}
        {dashboard.cards.length > 0 && (
          <div className={`grid gap-4 ${gridClassName}`}>
            {dashboard.cards.map((card) => (
              <div key={card.id} className="group relative min-h-56 rounded-md border bg-surface-100 p-4">
                <Button
                  variant="text"
                  size="tiny"
                  className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove card"
                  icon={<Trash2 size={14} />}
                  onClick={() => updateCards(dashboard.cards.filter((item) => item.id !== card.id))}
                />
                <DashboardCardView card={card} rangeId={rangeId} now={now} />
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCardDialog
        open={isAddingCard}
        rangeId={rangeId}
        now={now}
        onOpenChange={setIsAddingCard}
        onAdd={(card) => updateCards([...dashboard.cards, { ...card, id: createDashboardId() }])}
      />
    </div>
  )
}
