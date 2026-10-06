import { Boxes } from 'lucide-react'
import { Checkbox, cn } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { ConnectionsPanel } from './ConnectionsPanel'
import { DashboardsPanel } from './dashboards/DashboardsPanel'
import { DocsPanel } from './DocsPanel'
import { FilesPanel } from './FilesPanel'
import { SimulationPanel, type DataSource } from './simulation/SimulationPanel'
import type { SimulationController } from './simulation/useSimulation'
import { StreamsPanel } from './StreamsPanel'
import { TicketsPanel } from './TicketsPanel'
import { TWIN_MODULES, type TwinElement } from './twin.types'
import { UsersPanel } from './UsersPanel'
import type { ImportDiff } from '@/lib/twin/assets'

type ModulePanelProps = {
  moduleId: string
  elements: TwinElement[]
  modelName: string
  modelRevision?: number
  isImportingCsv: boolean
  csvResult: { fileName: string; diff: ImportDiff } | null
  csvError: string | null
  onUploadCsv: (file: File) => void
  newTicketAsset: string | null
  onNewTicketHandled: () => void
  isLoadingModel: boolean
  modelError: string | null
  hiddenCategories: Set<string>
  onToggleCategory: (category: string) => void
  onUploadFile: (file: File) => void
  onUseDemo: () => void
  simulation: SimulationController
  dataSource: DataSource
  onDataSourceChange: (source: DataSource) => void
}

const countByCategory = (elements: TwinElement[]) => {
  const counts = new Map<string, number>()
  elements.forEach((element) =>
    counts.set(element.category, (counts.get(element.category) ?? 0) + 1)
  )
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export const ModulePanel = ({
  moduleId,
  elements,
  modelName,
  modelRevision,
  isImportingCsv,
  csvResult,
  csvError,
  onUploadCsv,
  newTicketAsset,
  onNewTicketHandled,
  isLoadingModel,
  modelError,
  hiddenCategories,
  onToggleCategory,
  onUploadFile,
  onUseDemo,
  simulation,
  dataSource,
  onDataSourceChange,
}: ModulePanelProps) => {
  const label = TWIN_MODULES.find((item) => item.id === moduleId)?.label ?? 'Module'
  const categories = countByCategory(elements)

  return (
    <div className="flex h-full flex-col bg-dash-sidebar">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm uppercase tracking-wide">{label}</h2>
      </div>

      <div className={cn('flex-1 overflow-y-auto', moduleId !== 'simulation' && 'p-4')}>
        {moduleId === 'dashboards' && <DashboardsPanel />}

        {moduleId === 'simulation' && (
          <SimulationPanel
            simulation={simulation}
            dataSource={dataSource}
            onDataSourceChange={onDataSourceChange}
          />
        )}

        {moduleId === 'files' && (
          <FilesPanel
            modelName={modelName}
            revision={modelRevision}
            elementCount={elements.length}
            isLoadingModel={isLoadingModel}
            isImportingCsv={isImportingCsv}
            modelError={modelError}
            csvResult={csvResult}
            csvError={csvError}
            onUploadModel={onUploadFile}
            onUploadCsv={onUploadCsv}
            onUseDemo={onUseDemo}
          />
        )}

        {moduleId === 'docs' && <DocsPanel elements={elements} />}
        {moduleId === 'tickets' && (
          <TicketsPanel
            elements={elements}
            newTicketAsset={newTicketAsset}
            onNewTicketHandled={onNewTicketHandled}
          />
        )}
        {moduleId === 'users' && <UsersPanel />}
        {moduleId === 'connections' && <ConnectionsPanel />}
        {moduleId === 'streams' && <StreamsPanel elements={elements} />}

        {(moduleId === 'filters' || moduleId === 'assets') && (
          <div className="flex flex-col gap-y-2">
            <p className="text-sm text-foreground-light">
              {moduleId === 'filters' ? 'Show categories in the inventory' : 'Assets by category'}
            </p>
            {categories.map(([category, count]) => (
              <label key={category} className="flex cursor-pointer items-center gap-x-2 text-sm">
                <Checkbox
                  checked={!hiddenCategories.has(category)}
                  onCheckedChange={() => onToggleCategory(category)}
                />
                <span className="flex-1">{category}</span>
                <span className="text-foreground-lighter">{count}</span>
              </label>
            ))}
          </div>
        )}

        {![
          'dashboards',
          'files',
          'filters',
          'assets',
          'simulation',
          'connections',
          'streams',
          'docs',
          'tickets',
          'users',
        ].includes(moduleId) && (
          <EmptyStatePresentational
            icon={Boxes}
            title={`${label} is coming soon`}
            description="This module is part of the next build steps."
          />
        )}
      </div>
    </div>
  )
}
