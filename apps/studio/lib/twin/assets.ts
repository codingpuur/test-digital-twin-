// Asset records for a site: the platform's source of truth for what each element is.
// The 3D file (IFC/GLB) and CSV files are only *import sources*; once imported, the platform reads
// these records and user edits live in `override` so a re-import never destroys them.

export type AssetFields = {
  name: string
  category: string
  level: string
  room: string
  system: string
  /** Tag of the equipment (e.g. a pump-motor unit) this part belongs to; AI/ML results hang off it. */
  equipment: string
  properties: Record<string, string>
}

export type TwinAsset = {
  id: string
  /** Stable asset tag (e.g. "P-101"): the primary key used to match across model revisions. */
  tag: string
  /** IFC GlobalId when the model has one. */
  guid: string
  source: string
  status: 'active' | 'removed'
  /** False for rows that came from a CSV and match nothing in the 3D model. */
  hasGeometry: boolean
  revision: number
  /** Values as last imported from a file. */
  imported: AssetFields
  /** Values the user changed in the platform. */
  override: Partial<AssetFields>
}

export type AssetImportRow = {
  tag: string
  guid: string
  hasGeometry: boolean
  fields: AssetFields
}

export type ImportMode = 'model' | 'csv'

export type ImportDiff = {
  matched: number
  added: string[]
  /** Model imports only: assets no longer present in the new model. */
  removed: string[]
  /** CSV imports only: rows that matched no existing asset (they are added without geometry). */
  unmatched: string[]
}

export const EMPTY_FIELDS: AssetFields = {
  name: '',
  category: '',
  level: '',
  room: '',
  system: '',
  equipment: '',
  properties: {},
}

/** Category given to a bare GLB mesh: a placeholder, not information worth keeping over a CSV value. */
const PLACEHOLDER_CATEGORY = 'Mesh'

const isBlank = (value: string) => value === '' || value === PLACEHOLDER_CATEGORY

export const resolveAsset = (asset: TwinAsset): AssetFields => ({
  ...asset.imported,
  ...asset.override,
  properties: { ...asset.imported.properties, ...asset.override.properties },
})

export const findMatch = (assets: TwinAsset[], row: AssetImportRow) =>
  assets.find((asset) => row.tag !== '' && asset.tag === row.tag) ??
  assets.find((asset) => row.guid !== '' && asset.guid === row.guid)

/** Newer non-blank values win; blanks never erase what an earlier import supplied. */
const mergeFields = (
  current: AssetFields,
  incoming: AssetFields,
  mode: ImportMode
): AssetFields => ({
  name: isBlank(incoming.name) ? current.name : incoming.name,
  category: isBlank(incoming.category) ? current.category : incoming.category,
  level: isBlank(incoming.level) ? current.level : incoming.level,
  room: isBlank(incoming.room) ? current.room : incoming.room,
  system: isBlank(incoming.system) ? current.system : incoming.system,
  // A 3D model only guesses the equipment (e.g. from the STEP assembly tree), so a value a CSV or a
  // user supplied is kept; only a CSV can replace it.
  equipment:
    isBlank(incoming.equipment) || (mode === 'model' && current.equipment !== '')
      ? current.equipment
      : incoming.equipment,
  properties: { ...current.properties, ...incoming.properties },
})

type MergeOptions = {
  mode: ImportMode
  source: string
  revision: number
  createId: () => string
}

export const mergeImport = (
  existing: TwinAsset[],
  rows: AssetImportRow[],
  { mode, source, revision, createId }: MergeOptions
): { assets: TwinAsset[]; diff: ImportDiff } => {
  const diff: ImportDiff = { matched: 0, added: [], removed: [], unmatched: [] }
  const next = existing.map((asset) => ({ ...asset }))
  const seen = new Set<string>()

  for (const row of rows) {
    const asset = findMatch(next, row)
    if (asset) {
      diff.matched += 1
      seen.add(asset.id)
      asset.imported = mergeFields(asset.imported, row.fields, mode)
      asset.guid = row.guid || asset.guid
      asset.status = 'active'
      asset.revision = revision
      if (mode === 'model') {
        asset.source = source
        asset.hasGeometry = true
      }
      continue
    }

    const label = row.fields.name || row.tag
    if (mode === 'model') diff.added.push(label)
    else diff.unmatched.push(label)
    const created: TwinAsset = {
      id: createId(),
      tag: row.tag,
      guid: row.guid,
      source,
      status: 'active',
      hasGeometry: row.hasGeometry,
      revision,
      imported: mergeFields(EMPTY_FIELDS, row.fields, mode),
      override: {},
    }
    seen.add(created.id)
    next.push(created)
  }

  if (mode === 'model') {
    // Never delete: sensor links and tickets hang off the asset, so it is only marked as removed.
    for (const asset of next) {
      if (asset.hasGeometry && asset.status === 'active' && !seen.has(asset.id)) {
        asset.status = 'removed'
        diff.removed.push(resolveAsset(asset).name || asset.tag)
      }
    }
  }

  return { assets: next, diff }
}

export const EDITABLE_FIELDS = ['name', 'category', 'level', 'room', 'system', 'equipment'] as const
export type EditableField = (typeof EDITABLE_FIELDS)[number]
export type EditableValues = Pick<AssetFields, EditableField>

/** Keeps only the fields the user actually changed, so an unedited field keeps following re-imports. */
export const toOverride = (imported: AssetFields, edited: EditableValues): Partial<AssetFields> =>
  Object.fromEntries(
    EDITABLE_FIELDS.filter((key) => edited[key] !== imported[key]).map((key) => [key, edited[key]])
  )
