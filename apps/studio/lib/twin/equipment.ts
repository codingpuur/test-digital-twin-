// Equipment groups parts that belong together (e.g. the pump, motor and coupling of one unit).
// Sensors and AI/ML results describe the whole equipment, never a single part of it.

type HasEquipment = { id: string; equipment?: string }

/** Every part that belongs to the equipment with this tag. */
export const partsOfEquipment = <T extends HasEquipment>(parts: T[], tag: string): T[] =>
  tag === '' ? [] : parts.filter((part) => part.equipment === tag)

/** The distinct equipment tags in use, in the order they first appear. */
export const equipmentTags = (parts: HasEquipment[]): string[] => [
  ...new Set(parts.map((part) => part.equipment ?? '').filter((tag) => tag !== '')),
]
