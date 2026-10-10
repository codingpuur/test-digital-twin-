import type { AnimationBinding } from './animation.types'
import { HIGH_LEVEL_WARNING, PUMP_NAMES, VIBRATION_WARNING } from './simulation.model'

let counter = 0
const binding = (input: Omit<AnimationBinding, 'id' | 'enabled'>): AnimationBinding => {
  counter += 1
  return { id: `default-${counter}`, enabled: true, ...input }
}

/** Animations for the built-in demo station. Uploaded models start with none. */
export const getDefaultBindings = (): AnimationBinding[] => {
  counter = 0
  return [
    ...PUMP_NAMES.map((_, i) => i + 1).flatMap((n) => [
      binding({ elementName: `P-10${n} Pump`, effect: 'rotate', signal: `p${n}.speed`, max: 100 }),
      binding({
        elementName: `P-10${n} Pump`,
        effect: 'pulse',
        signal: `p${n}.vib`,
        max: 12,
        threshold: VIBRATION_WARNING,
      }),
      binding({
        elementName: `M-10${n} Motor`,
        effect: 'pulse',
        signal: `p${n}.vib`,
        max: 12,
        threshold: VIBRATION_WARNING,
      }),
      binding({
        elementName: `Suction pipe 10${n}`,
        effect: 'flow',
        signal: `p${n}.speed`,
        max: 100,
      }),
      binding({
        elementName: `Discharge pipe 10${n}`,
        effect: 'flow',
        signal: `p${n}.speed`,
        max: 100,
      }),
      binding({
        elementName: `DV-10${n} Discharge valve`,
        effect: 'valve',
        signal: 'valve.pos',
        max: 100,
      }),
    ]),
    binding({ elementName: 'Suction header', effect: 'flow', signal: 'flow', max: 1500 }),
    binding({ elementName: 'Discharge header', effect: 'flow', signal: 'flow', max: 1500 }),
    binding({ elementName: 'Wet well', effect: 'fill', signal: 'level', max: 100 }),
    binding({
      elementName: 'LT-001 Level sensor',
      effect: 'pulse',
      signal: 'level',
      max: 100,
      threshold: HIGH_LEVEL_WARNING,
    }),
  ]
}
