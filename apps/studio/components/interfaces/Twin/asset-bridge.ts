import type { TwinElement } from './twin.types'
import {
  resolveAsset,
  type AssetFields,
  type AssetImportRow,
  type TwinAsset,
} from '@/lib/twin/assets'

export const elementTag = (element: TwinElement) => element.tag ?? element.name

/** Only IFC ids are stable across loads; a GLB mesh uuid is random, so it must not be stored. */
const stableGuid = (element: TwinElement) => (element.id.startsWith('ifc-') ? element.guid : '')

export const elementsToImportRows = (elements: TwinElement[]): AssetImportRow[] =>
  elements.map((element) => ({
    tag: elementTag(element),
    guid: stableGuid(element),
    hasGeometry: true,
    fields: {
      name: element.name,
      category: element.category,
      level: element.level,
      room: element.room,
      system: element.system,
      equipment: element.equipment ?? '',
      properties: {},
    },
  }))

/**
 * Overlays asset records on the elements read from the 3D scene, and appends the assets that exist
 * only in a CSV (no geometry). Removed assets are left out of the inventory.
 */
export const applyAssets = (elements: TwinElement[], assets: TwinAsset[]): TwinElement[] => {
  const active = assets.filter((asset) => asset.status === 'active')
  const byTag = new Map(active.map((asset) => [asset.tag, asset]))
  const used = new Set<string>()

  const merged = elements.map((element): TwinElement => {
    const asset =
      byTag.get(elementTag(element)) ??
      active.find((item) => stableGuid(element) !== '' && item.guid === stableGuid(element))
    if (!asset) return element
    used.add(asset.id)
    return {
      ...element,
      ...toElementFields(asset),
      tag: asset.tag,
      assetId: asset.id,
      hasGeometry: true,
    }
  })

  const csvOnly = active
    .filter((asset) => !used.has(asset.id))
    .map(
      (asset): TwinElement => ({
        id: `asset-${asset.id}`,
        source: asset.source,
        guid: asset.guid,
        tag: asset.tag,
        assetId: asset.id,
        hasGeometry: false,
        name: resolveAsset(asset).name || asset.tag,
        ...toElementFields(asset),
      })
    )

  return [...merged, ...csvOnly]
}

const toElementFields = (asset: TwinAsset) => {
  const resolved: AssetFields = resolveAsset(asset)
  return {
    displayName: resolved.name,
    category: resolved.category || 'Mesh',
    level: resolved.level,
    room: resolved.room,
    system: resolved.system,
    equipment: resolved.equipment,
    properties: resolved.properties,
    isEdited: Object.keys(asset.override).length > 0,
  }
}
