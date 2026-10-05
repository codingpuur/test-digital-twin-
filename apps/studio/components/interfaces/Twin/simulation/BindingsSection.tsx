import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from 'ui'

import { EFFECT_OPTIONS, type AnimationBinding, type EffectId } from './animation.types'
import { SIGNAL_OPTIONS } from './signals'

type BindingsSectionProps = {
  elementName: string
  bindings: AnimationBinding[]
  onChange: (bindings: AnimationBinding[]) => void
}

const effectLabel = (id: EffectId) => EFFECT_OPTIONS.find((option) => option.id === id)?.label ?? id
const signalLabel = (id: string) => SIGNAL_OPTIONS.find((option) => option.id === id)?.label ?? id

/** Lists and edits the animation bindings of the selected element. */
export const BindingsSection = ({ elementName, bindings, onChange }: BindingsSectionProps) => {
  const [isAdding, setIsAdding] = useState(false)
  const [effect, setEffect] = useState<EffectId>('rotate')
  const [signal, setSignal] = useState(SIGNAL_OPTIONS[0].id)

  const own = bindings.filter((binding) => binding.elementName === elementName)

  const update = (id: string, patch: Partial<AnimationBinding>) =>
    onChange(bindings.map((binding) => (binding.id === id ? { ...binding, ...patch } : binding)))

  const handleAdd = () => {
    const option = SIGNAL_OPTIONS.find((item) => item.id === signal)
    const usesThreshold = EFFECT_OPTIONS.find((item) => item.id === effect)?.usesThreshold
    onChange([
      ...bindings,
      {
        id: `binding-${Date.now().toString(36)}`,
        elementName,
        effect,
        signal,
        max: option?.max ?? 100,
        threshold: usesThreshold ? (option?.max ?? 100) * 0.7 : undefined,
        enabled: true,
      },
    ])
    setIsAdding(false)
  }

  return (
    <div className="flex flex-col gap-y-2">
      <h3 className="text-xs uppercase tracking-wide text-foreground-light">Animation bindings</h3>
      {own.length === 0 && (
        <p className="text-sm text-foreground-lighter">No animations on this element.</p>
      )}
      {own.map((binding) => (
        <div
          key={binding.id}
          className="flex flex-col gap-y-1.5 rounded-md border bg-surface-100 p-2.5 text-sm"
        >
          <div className="flex items-center justify-between">
            <span>{effectLabel(binding.effect)}</span>
            <div className="flex items-center gap-x-2">
              <Switch
                aria-label={`Enable ${effectLabel(binding.effect)}`}
                checked={binding.enabled}
                onCheckedChange={(enabled) => update(binding.id, { enabled })}
              />
              <Button
                size="tiny"
                variant="text"
                aria-label="Remove binding"
                icon={<Trash2 size={14} />}
                onClick={() => onChange(bindings.filter((item) => item.id !== binding.id))}
              />
            </div>
          </div>
          <Select
            value={binding.signal}
            onValueChange={(value) => update(binding.id, { signal: value })}
          >
            <SelectTrigger size="tiny" aria-label="Signal">
              <SelectValue>{signalLabel(binding.signal)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SIGNAL_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label} ({option.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {binding.threshold !== undefined && (
            <p className="text-xs text-foreground-lighter">Pulses above {binding.threshold}</p>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="flex flex-col gap-y-2 rounded-md border bg-surface-100 p-2.5">
          <Select value={effect} onValueChange={(value) => setEffect(value as EffectId)}>
            <SelectTrigger size="tiny" aria-label="Effect">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EFFECT_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={signal} onValueChange={setSignal}>
            <SelectTrigger size="tiny" aria-label="New binding signal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIGNAL_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label} ({option.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-x-2">
            <Button size="tiny" variant="primary" onClick={handleAdd}>
              Add
            </Button>
            <Button size="tiny" variant="default" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="default" icon={<Plus size={14} />} onClick={() => setIsAdding(true)}>
          Add binding
        </Button>
      )}
    </div>
  )
}
