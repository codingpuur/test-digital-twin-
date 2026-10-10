export const pumpKeys = {
  meta: (ref: string | undefined) => ['twin', ref, 'pump', 'meta'] as const,
  list: (ref: string | undefined) => ['twin', ref, 'pump', 'pumps'] as const,
  defaults: (ref: string | undefined, pump: number | undefined) =>
    ['twin', ref, 'pump', pump, 'defaults'] as const,
  baseline: (ref: string | undefined, pump: number | undefined) =>
    ['twin', ref, 'pump', pump, 'baseline'] as const,
  mesh: (ref: string | undefined) => ['twin', ref, 'pump', 'mesh'] as const,
  latest: (ref: string | undefined, pump: number | undefined) =>
    ['twin', ref, 'pump', pump, 'latest'] as const,
}
