export const pumpKeys = {
  meta: (ref: string | undefined) => ['twin', ref, 'pump', 'meta'] as const,
  list: (ref: string | undefined) => ['twin', ref, 'pump', 'pumps'] as const,
  defaults: (ref: string | undefined, pump: number | undefined) =>
    ['twin', ref, 'pump', pump, 'defaults'] as const,
  baseline: (ref: string | undefined, pump: number | undefined) =>
    ['twin', ref, 'pump', pump, 'baseline'] as const,
  layers: (ref: string | undefined, pump: number | undefined, which: string) =>
    ['twin', ref, 'pump', pump, 'layers', which] as const,
  layer: (ref: string | undefined, pump: number | undefined, which: string, key: string | null) =>
    ['twin', ref, 'pump', pump, 'layers', which, key] as const,
  fmea: (ref: string | undefined, pump: number | undefined) =>
    ['twin', ref, 'pump', pump, 'fmea'] as const,
  life: (ref: string | undefined, pump: number | undefined) =>
    ['twin', ref, 'pump', pump, 'life'] as const,
  report: (ref: string | undefined, pump: number | undefined, period: string) =>
    ['twin', ref, 'pump', pump, 'report', period] as const,
  history: (ref: string | undefined, pump: number | undefined, days: number) =>
    ['twin', ref, 'pump', pump, 'history', days] as const,
  mesh: (ref: string | undefined) => ['twin', ref, 'pump', 'mesh'] as const,
  latest: (ref: string | undefined, pump: number | undefined) =>
    ['twin', ref, 'pump', pump, 'latest'] as const,
}
