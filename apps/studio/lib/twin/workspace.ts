// Records a site accumulates beyond the model: maintenance tickets, documents and people.

export type TicketPriority = 'low' | 'medium' | 'high'
export type TicketStatus = 'open' | 'in-progress' | 'done'

export const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high']
export const TICKET_STATUSES: { id: TicketStatus; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
]

export type TwinTicket = {
  id: string
  /** Human-friendly sequence per site: T-1, T-2, ... */
  number: number
  title: string
  description: string
  /** Asset tag the ticket is about ('' for a general ticket). */
  assetTag: string
  priority: TicketPriority
  status: TicketStatus
  assignee: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type TicketInput = Pick<
  TwinTicket,
  'title' | 'description' | 'assetTag' | 'priority' | 'assignee'
>

export type TwinDoc = {
  id: string
  name: string
  size: number
  assetTag: string
  uploadedBy: string
  uploadedAt: string
}

export type MemberRole = 'admin' | 'editor' | 'viewer'

export const MEMBER_ROLES: { id: MemberRole; label: string; description: string }[] = [
  { id: 'admin', label: 'Admin', description: 'Manage site, users and data' },
  { id: 'editor', label: 'Editor', description: 'Edit assets, dashboards and tickets' },
  { id: 'viewer', label: 'Viewer', description: 'View only' },
]

export type TwinMember = {
  id: string
  email: string
  role: MemberRole
  addedAt: string
  /** True for the account owner, who cannot be removed or demoted. */
  isOwner: boolean
}

export const nextTicketNumber = (tickets: Pick<TwinTicket, 'number'>[]) =>
  tickets.reduce((highest, ticket) => Math.max(highest, ticket.number), 0) + 1

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
