import { useMemo, useState } from 'react'
import DataGrid, { type Column } from 'react-data-grid'
import { Checkbox, Input } from 'ui'

import type { TwinElement } from './twin.types'

const COLUMNS: Column<TwinElement>[] = [
  {
    key: 'name',
    name: 'Name',
    minWidth: 220,
    resizable: true,
    sortable: true,
    renderCell: ({ row }) => (
      <span className={row.hasGeometry === false ? 'text-foreground-light' : undefined}>
        {row.displayName ?? row.name}
        {row.isEdited && <span className="ml-1.5 text-foreground-lighter">(edited)</span>}
        {row.hasGeometry === false && <span className="ml-1.5 text-foreground-lighter">no 3D</span>}
      </span>
    ),
  },
  { key: 'level', name: 'Level', resizable: true },
  { key: 'room', name: 'Rooms', resizable: true },
  { key: 'category', name: 'Category', resizable: true },
  { key: 'system', name: 'System', resizable: true },
  { key: 'equipment', name: 'Equipment', resizable: true },
  { key: 'source', name: 'Source', resizable: true },
  { key: 'guid', name: 'GUID', resizable: true },
]

type InventoryTableProps = {
  elements: TwinElement[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

const NON_ASSET_CATEGORIES = new Set(['Floors', 'Walls', 'Roofs', 'Mesh'])

export const InventoryTable = ({ elements, selectedId, onSelect }: InventoryTableProps) => {
  const [search, setSearch] = useState('')
  const [assetsOnly, setAssetsOnly] = useState(false)

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return elements.filter((element) => {
      if (assetsOnly && NON_ASSET_CATEGORIES.has(element.category)) return false
      if (!query) return true
      return [
        element.displayName ?? element.name,
        element.tag ?? '',
        element.category,
        element.room,
        element.system,
        element.equipment ?? '',
      ].some((value) => value.toLowerCase().includes(query))
    })
  }, [elements, search, assetsOnly])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-x-4 border-b px-4 py-2">
        <div className="flex items-center gap-x-3">
          <h3 className="text-xs uppercase tracking-wide text-foreground-light">Inventory</h3>
          <span className="text-xs text-foreground-lighter">{rows.length} items</span>
        </div>
        <div className="flex items-center gap-x-4">
          <Input
            size="tiny"
            className="w-56"
            placeholder="Filter inventory"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-x-2 text-sm text-foreground-light">
            <Checkbox
              checked={assetsOnly}
              onCheckedChange={(value) => setAssetsOnly(value === true)}
            />
            Assets only
          </label>
        </div>
      </div>
      <DataGrid
        className="h-full flex-1 text-xs [--rdg-background-color:transparent] [--rdg-header-background-color:transparent]"
        columns={COLUMNS}
        rows={rows}
        rowKeyGetter={(row) => row.id}
        rowHeight={32}
        headerRowHeight={32}
        onCellClick={({ row }) => onSelect(row.id)}
        rowClass={(row) => (row.id === selectedId ? 'twin-row-selected' : undefined)}
      />
    </div>
  )
}
