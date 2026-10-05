export type TwinElement = {
  id: string
  name: string
  level: string
  room: string
  category: string
  system: string
  source: string
  guid: string
}

export type TwinModule = {
  id: string
  label: string
}

export const TWIN_MODULES: TwinModule[] = [
  { id: 'dashboards', label: 'Dashboards' },
  { id: 'filters', label: 'Filters' },
  { id: 'assets', label: 'Assets' },
  { id: 'files', label: 'Files' },
  { id: 'docs', label: 'Docs' },
  { id: 'systems', label: 'Systems' },
  { id: 'connections', label: 'Connections' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'users', label: 'Users' },
  { id: 'streams', label: 'Streams' },
]

export const DEFAULT_TWIN_MODULE = 'dashboards'
