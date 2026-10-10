export type TwinElement = {
  id: string
  name: string
  level: string
  room: string
  category: string
  system: string
  /** Tag of the equipment this part belongs to; analysis (health, faults, RUL) is per equipment. */
  equipment?: string
  source: string
  guid: string
  /** Ids of mock streams that report on this element. */
  streamIds?: string[]
  /** Stable asset tag used to match this element to its asset record across model revisions. */
  tag?: string
  /** Asset record this element is backed by, once the model has been imported. */
  assetId?: string
  /** Name after user edits. `name` stays the model's own name, which bindings and readings key on. */
  displayName?: string
  /** Extra properties imported from a CSV or IFC. */
  properties?: Record<string, string>
  isEdited?: boolean
  /** False for inventory rows that exist only in a CSV and have no 3D object. */
  hasGeometry?: boolean
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
  { id: 'simulation', label: 'Simulation' },
  { id: 'pump', label: 'Pump twin' },
]

export const DEFAULT_TWIN_MODULE = 'dashboards'
