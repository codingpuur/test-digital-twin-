import { BarChart3, Boxes, FileUp, LayoutDashboard } from 'lucide-react'
import { useRef } from 'react'
import { Button, Checkbox } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { TWIN_MODULES, type TwinElement } from './twin.types'

type ModulePanelProps = {
  moduleId: string
  elements: TwinElement[]
  modelName: string
  isLoadingModel: boolean
  modelError: string | null
  hiddenCategories: Set<string>
  onToggleCategory: (category: string) => void
  onUploadFile: (file: File) => void
  onUseDemo: () => void
}

const countByCategory = (elements: TwinElement[]) => {
  const counts = new Map<string, number>()
  elements.forEach((element) => counts.set(element.category, (counts.get(element.category) ?? 0) + 1))
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export const ModulePanel = ({
  moduleId,
  elements,
  modelName,
  isLoadingModel,
  modelError,
  hiddenCategories,
  onToggleCategory,
  onUploadFile,
  onUseDemo,
}: ModulePanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const label = TWIN_MODULES.find((item) => item.id === moduleId)?.label ?? 'Module'
  const categories = countByCategory(elements)

  return (
    <div className="flex h-full flex-col bg-dash-sidebar">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm uppercase tracking-wide">{label}</h2>
        {moduleId === 'dashboards' && (
          <Button variant="text" disabled icon={<LayoutDashboard size={14} />}>
            Create Dashboard
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {moduleId === 'dashboards' && (
          <EmptyStatePresentational
            icon={BarChart3}
            title="No dashboards created yet"
            description="Dashboards show live values from your streams once the twin is published."
          />
        )}

        {moduleId === 'files' && (
          <div className="flex flex-col gap-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf,.ifc"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onUploadFile(file)
                event.target.value = ''
              }}
            />
            <EmptyStatePresentational
              icon={FileUp}
              title="3D model"
              description="Upload a GLB, glTF or IFC file. It is processed in your browser."
            >
              <Button
                variant="primary"
                loading={isLoadingModel}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload model
              </Button>
              <Button variant="default" onClick={onUseDemo}>
                Use demo model
              </Button>
            </EmptyStatePresentational>
            {modelError && <p className="text-sm text-destructive">{modelError}</p>}
            <div className="rounded-md border bg-surface-100 p-3 text-sm">
              <p className="text-foreground-light">Current model</p>
              <p>{modelName}</p>
              <p className="text-foreground-lighter">{elements.length} elements</p>
            </div>
          </div>
        )}

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

        {!['dashboards', 'files', 'filters', 'assets'].includes(moduleId) && (
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
