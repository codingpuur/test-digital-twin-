import { EMPTY_FIELDS, type AssetImportRow } from './assets'

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF, commas inside quotes. */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let isQuoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (isQuoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        isQuoted = false
      } else {
        field += char
      }
      continue
    }
    if (char === '"') isQuoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

const KNOWN_COLUMNS = {
  tag: ['tag', 'asset tag', 'asset id', 'asset', 'id', 'part number', 'item number'],
  name: ['name', 'description', 'part name'],
  category: ['category', 'type', 'class', 'ifc class'],
  level: ['level', 'floor', 'storey'],
  room: ['room', 'space', 'location'],
  system: ['system'],
  equipment: ['equipment', 'equipment tag', 'equipment id', 'assembly', 'unit'],
  guid: ['guid', 'globalid', 'global id'],
} as const

type KnownColumn = keyof typeof KNOWN_COLUMNS

const columnFor = (header: string): KnownColumn | null => {
  const normalized = header.trim().toLowerCase()
  const match = (Object.keys(KNOWN_COLUMNS) as KnownColumn[]).find((key) =>
    (KNOWN_COLUMNS[key] as readonly string[]).includes(normalized)
  )
  return match ?? null
}

export type CsvParseResult =
  | { status: 'success'; rows: AssetImportRow[] }
  | { status: 'error'; message: string }

/**
 * Turns a CSV (e.g. a SolidWorks BOM export) into import rows. Known headers map to asset fields;
 * every other column becomes a property. The match key is the tag column, falling back to name.
 */
export const csvToImportRows = (text: string): CsvParseResult => {
  const [headers, ...body] = parseCsv(text)
  if (!headers) return { status: 'error', message: 'The CSV file is empty.' }

  const mapped = headers.map(columnFor)
  if (!mapped.includes('tag') && !mapped.includes('name')) {
    return {
      status: 'error',
      message: 'Add a "tag" (or "name") column so rows can be matched to the 3D model.',
    }
  }

  const rows = body.map((cells): AssetImportRow => {
    const fields = { ...EMPTY_FIELDS, properties: {} as Record<string, string> }
    let tag = ''
    let guid = ''
    mapped.forEach((column, index) => {
      const value = (cells[index] ?? '').trim()
      if (value === '') return
      if (column === 'tag') tag = value
      else if (column === 'guid') guid = value
      else if (column) fields[column] = value
      else fields.properties[headers[index].trim()] = value
    })
    if (tag === '') tag = fields.name
    if (fields.name === '') fields.name = tag
    return { tag, guid, hasGeometry: false, fields }
  })

  return { status: 'success', rows: rows.filter((row) => row.tag !== '') }
}
