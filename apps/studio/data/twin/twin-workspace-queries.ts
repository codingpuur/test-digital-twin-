import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { twinFetch, twinFetchJson } from './twin-api'
import type {
  MemberRole,
  TicketInput,
  TicketStatus,
  TwinDoc,
  TwinMember,
  TwinTicket,
} from '@/lib/twin/workspace'

export const workspaceKeys = {
  tickets: (ref: string | undefined) => ['twin', ref, 'tickets'] as const,
  docs: (ref: string | undefined) => ['twin', ref, 'docs'] as const,
  members: (ref: string | undefined) => ['twin', ref, 'members'] as const,
}

// Tickets

export const useTwinTicketsQuery = (ref: string | undefined) =>
  useQuery({
    queryKey: workspaceKeys.tickets(ref),
    queryFn: async () =>
      (await twinFetchJson<{ tickets: TwinTicket[] }>(`/${ref}/tickets`)).tickets,
    enabled: Boolean(ref),
  })

export const useCreateTwinTicketMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TicketInput) =>
      twinFetchJson<{ ticket: TwinTicket }>(`/${ref}/tickets`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.tickets(ref) }),
  })
}

export const useUpdateTwinTicketMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: { id: string } & Partial<TicketInput & { status: TicketStatus }>) =>
      twinFetchJson<{ ticket: TwinTicket }>(`/${ref}/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.tickets(ref) }),
  })
}

export const useDeleteTwinTicketMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => twinFetchJson(`/${ref}/tickets/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.tickets(ref) }),
  })
}

// Documents

export const useTwinDocsQuery = (ref: string | undefined) =>
  useQuery({
    queryKey: workspaceKeys.docs(ref),
    queryFn: async () => (await twinFetchJson<{ docs: TwinDoc[] }>(`/${ref}/docs`)).docs,
    enabled: Boolean(ref),
  })

export const useUploadTwinDocMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, assetTag }: { file: File; assetTag: string }) => {
      const response = await twinFetch(`/${ref}/docs`, {
        method: 'POST',
        headers: {
          'X-File-Name': encodeURIComponent(file.name),
          'X-Asset-Tag': encodeURIComponent(assetTag),
        },
        body: file,
      })
      return ((await response.json()) as { doc: TwinDoc }).doc
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.docs(ref) }),
  })
}

export const useDeleteTwinDocMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => twinFetchJson(`/${ref}/docs/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.docs(ref) }),
  })
}

/** Fetches a document with the user's auth and hands it to the browser as a download. */
export const downloadTwinDoc = async (ref: string, doc: TwinDoc) => {
  const blob = await (await twinFetch(`/${ref}/docs/${doc.id}`)).blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = doc.name
  link.click()
  URL.revokeObjectURL(url)
}

// Members

export const useTwinMembersQuery = (ref: string | undefined) =>
  useQuery({
    queryKey: workspaceKeys.members(ref),
    queryFn: async () =>
      (await twinFetchJson<{ members: TwinMember[] }>(`/${ref}/members`)).members,
    enabled: Boolean(ref),
  })

export const useInviteTwinMemberMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: MemberRole }) =>
      twinFetchJson(`/${ref}/members`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.members(ref) }),
  })
}

export const useUpdateTwinMemberMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: MemberRole }) =>
      twinFetchJson(`/${ref}/members/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.members(ref) }),
  })
}

export const useRemoveTwinMemberMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => twinFetchJson(`/${ref}/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.members(ref) }),
  })
}
