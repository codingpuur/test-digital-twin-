export type EffectId = 'rotate' | 'fill' | 'flow' | 'pulse' | 'valve'

export type EffectOption = {
  id: EffectId
  label: string
  description: string
  /** True when the binding needs a threshold instead of a max. */
  usesThreshold: boolean
}

export const EFFECT_OPTIONS: EffectOption[] = [
  {
    id: 'rotate',
    label: 'Rotate',
    description: 'Spin the part; faster as the signal rises',
    usesThreshold: false,
  },
  {
    id: 'flow',
    label: 'Flow dashes',
    description: 'Moving dashes along a pipe',
    usesThreshold: false,
  },
  {
    id: 'fill',
    label: 'Fill height',
    description: 'Water height from the signal',
    usesThreshold: false,
  },
  {
    id: 'valve',
    label: 'Valve handle',
    description: 'Turn the handle with the position signal',
    usesThreshold: false,
  },
  {
    id: 'pulse',
    label: 'Pulse red',
    description: 'Blink red above a threshold',
    usesThreshold: true,
  },
]

/** Ties one element to one effect, driven by one signal. Elements are matched by name so models can be swapped. */
export type AnimationBinding = {
  id: string
  elementName: string
  effect: EffectId
  signal: string
  /** Signal value that means "full" for rotate, flow, fill and valve. */
  max: number
  /** Signal value above which `pulse` fires. */
  threshold?: number
  enabled: boolean
}
