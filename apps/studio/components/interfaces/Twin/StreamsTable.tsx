import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useParams } from 'common'
import { Waves } from 'lucide-react'
import { Badge } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { Sparkline } from './Sparkline'
import { useTwinStreamsQuery, type TwinStreamRow } from '@/data/twin/twin-queries'
import { isWarningValue } from '@/lib/twin/streams'

const formatAge = (timestamp: number | null) => {
  if (timestamp === null) return '-'
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86_400)}d ago`
}

const COLUMNS: ColumnDef<TwinStreamRow>[] = [
  { id: 'stream', header: 'Stream', cell: ({ row }) => row.original.key },
  {
    id: 'asset',
    header: 'Asset',
    cell: ({ row }) =>
      row.original.assetTag || <span className="text-foreground-lighter">Unmapped</span>,
  },
  { id: 'parameter', header: 'Parameter', cell: ({ row }) => row.original.parameter || '-' },
  {
    id: 'value',
    header: 'Last value',
    cell: ({ row }) => {
      const { lastValue, unit, warnAbove } = row.original
      if (lastValue === null) return '-'
      const isWarning = isWarningValue(lastValue, warnAbove)
      return (
        <span className="flex items-center gap-x-2">
          {+lastValue.toFixed(2)} {unit}
          {isWarning && <Badge variant="warning">Warning</Badge>}
        </span>
      )
    },
  },
  {
    id: 'trend',
    header: 'Trend',
    cell: ({ row }) => (
      <Sparkline values={row.original.readings.slice(-40).map((reading) => reading.value)} />
    ),
  },
  { id: 'updated', header: 'Updated', cell: ({ row }) => formatAge(row.original.lastTs) },
]

/** All sensor streams of the site with their latest value: the bottom drawer's "Streams" tab. */
export const StreamsTable = () => {
  const { ref } = useParams()
  const { data } = useTwinStreamsQuery(ref)
  const streams = data?.streams ?? []

  const table = useReactTable({
    data: streams,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  if (streams.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyStatePresentational
          icon={Waves}
          title="No streams yet"
          description="Send readings from Connections and they appear here."
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface-100 text-left text-foreground-lighter">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b">
              {group.headers.map((header) => (
                <th key={header.id} className="px-4 py-2 font-medium">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-surface-200">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
