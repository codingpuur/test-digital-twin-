import { useParams } from 'common'
import { Plus, Ticket, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  Badge,
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'ui'
import { ConfirmationModal } from 'ui-patterns/Dialogs/ConfirmationModal'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { elementTag } from './asset-bridge'
import { NewTicketDialog } from './NewTicketDialog'
import type { TwinElement } from './twin.types'
import {
  useCreateTwinTicketMutation,
  useDeleteTwinTicketMutation,
  useTwinMembersQuery,
  useTwinTicketsQuery,
  useUpdateTwinTicketMutation,
} from '@/data/twin/twin-workspace-queries'
import {
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
  type TwinTicket,
} from '@/lib/twin/workspace'

type TicketsPanelProps = {
  elements: TwinElement[]
  /** Asset to link a new ticket to; set when arriving from an element's properties. */
  newTicketAsset: string | null
  onNewTicketHandled: () => void
}

const PRIORITY_VARIANT: Record<TicketPriority, 'destructive' | 'warning' | 'default'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'default',
}

type Filter = 'all' | TicketStatus

export const TicketsPanel = ({
  elements,
  newTicketAsset,
  onNewTicketHandled,
}: TicketsPanelProps) => {
  const { ref } = useParams()
  const { data: tickets = [] } = useTwinTicketsQuery(ref)
  const { data: members = [] } = useTwinMembersQuery(ref)
  const createTicket = useCreateTwinTicketMutation(ref)
  const updateTicket = useUpdateTwinTicketMutation(ref)
  const deleteTicket = useDeleteTwinTicketMutation(ref)

  const [filter, setFilter] = useState<Filter>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<TwinTicket | null>(null)

  const assetTags = [...new Set(elements.map(elementTag))].sort()
  // Arriving from an element's properties opens the dialog straight away, linked to that asset.
  const isDialogOpen = isCreating || newTicketAsset !== null
  const visible = tickets.filter((ticket) => filter === 'all' || ticket.status === filter)

  const closeDialog = () => {
    setIsCreating(false)
    onNewTicketHandled()
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Button variant="default" icon={<Plus size={14} />} onClick={() => setIsCreating(true)}>
        New ticket
      </Button>

      <div className="flex flex-wrap gap-1">
        {([{ id: 'all', label: 'All' }, ...TICKET_STATUSES] as { id: Filter; label: string }[]).map(
          (item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                filter === item.id
                  ? 'border-foreground-muted bg-surface-300 text-foreground'
                  : 'text-foreground-light hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          )
        )}
      </div>

      {visible.length === 0 && (
        <EmptyStatePresentational
          icon={Ticket}
          title={tickets.length === 0 ? 'No tickets yet' : 'No tickets here'}
          description="Track maintenance work against an asset, with a priority and an owner."
        />
      )}

      {visible.map((ticket) => (
        <div key={ticket.id} className="flex flex-col gap-y-2 rounded-md border bg-surface-100 p-3">
          <div className="flex items-start justify-between gap-x-2">
            <div className="min-w-0">
              <p className="text-xs text-foreground-lighter">T-{ticket.number}</p>
              <p className="break-words text-sm">{ticket.title}</p>
            </div>
            <Badge variant={PRIORITY_VARIANT[ticket.priority]} className="capitalize">
              {ticket.priority}
            </Badge>
          </div>
          {ticket.description && (
            <p className="line-clamp-2 text-xs text-foreground-light">{ticket.description}</p>
          )}
          <p className="text-xs text-foreground-lighter">
            {ticket.assetTag || 'No asset'} · {ticket.assignee || 'Unassigned'}
          </p>
          <div className="flex items-center justify-between gap-x-2">
            <Select
              value={ticket.status}
              onValueChange={(status) =>
                updateTicket.mutate({ id: ticket.id, status: status as TicketStatus })
              }
            >
              <SelectTrigger
                size="tiny"
                aria-label={`Status of T-${ticket.number}`}
                className="w-32"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_STATUSES.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="text"
              size="tiny"
              aria-label={`Delete T-${ticket.number}`}
              icon={<Trash2 size={14} />}
              onClick={() => setTicketToDelete(ticket)}
            />
          </div>
        </div>
      ))}

      <NewTicketDialog
        open={isDialogOpen}
        assetTags={assetTags}
        members={members.map((member) => member.email)}
        initialAssetTag={newTicketAsset ?? ''}
        isSaving={createTicket.isPending}
        onOpenChange={(open) => !open && closeDialog()}
        onCreate={(input) => createTicket.mutate(input, { onSuccess: closeDialog })}
      />

      <ConfirmationModal
        visible={ticketToDelete !== null}
        title={`Delete T-${ticketToDelete?.number}?`}
        description="This ticket will be removed for everyone on the site."
        confirmLabel="Delete ticket"
        loading={deleteTicket.isPending}
        onCancel={() => setTicketToDelete(null)}
        onConfirm={() =>
          ticketToDelete &&
          deleteTicket.mutate(ticketToDelete.id, { onSuccess: () => setTicketToDelete(null) })
        }
      />
    </div>
  )
}
