import { Play, RotateCcw } from 'lucide-react'
import { Button, cn, Input, Switch } from 'ui'

import type { PumpFormState } from './pump-request'
import type { PumpMeta, PumpSummary, PumpWhatIfDefaults } from '@/data/twin/pump-types'

type PumpPanelProps = {
  meta: PumpMeta
  pumps: PumpSummary[]
  pump: number
  onPumpChange: (pump: number) => void
  defaults: PumpWhatIfDefaults | undefined
  form: PumpFormState
  onFormChange: (form: PumpFormState) => void
  isRunning: boolean
  onRun: () => void
  onReset: () => void
}

const round = (value: number) => Number(value.toPrecision(6))

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-y-2 border-b px-4 py-3">
    <h3 className="text-xs uppercase tracking-wide text-foreground-light">{title}</h3>
    {children}
  </section>
)

export const PumpPanel = ({
  meta,
  pumps,
  pump,
  onPumpChange,
  defaults,
  form,
  onFormChange,
  isRunning,
  onRun,
  onReset,
}: PumpPanelProps) => {
  const statusByPump = new Map(pumps.map((item) => [item.pump, item.health_index.status]))

  return (
    <div className="flex flex-col">
      <Section title="Pump">
        <div className="grid grid-cols-4 gap-1.5">
          {meta.pumps.map((number) => {
            const status = statusByPump.get(number)
            return (
              <button
                key={number}
                type="button"
                aria-pressed={pump === number}
                onClick={() => onPumpChange(number)}
                className={cn(
                  'flex items-center justify-center gap-x-1.5 rounded-md border py-1.5 text-sm transition-colors hover:border-foreground-muted',
                  pump === number ? 'border-brand bg-surface-200' : 'bg-surface-100'
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    status === 'act' && 'bg-destructive',
                    status === 'watch' && 'bg-warning',
                    (status === 'ok' || !status) && 'bg-brand'
                  )}
                />
                P{number}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Operating point">
        {meta.fields.map((field) => {
          const current = defaults?.defaults[field.k]
          if (current === undefined) return null
          const limits = defaults?.limits[field.k]
          const isSpeed = field.k === 'speed_rpm'
          return (
            <label key={field.k} className="flex flex-col gap-y-1 text-sm" title={field.hint}>
              <span className="flex justify-between text-foreground-light">
                {field.label}
                <span className="text-xs text-foreground-lighter">
                  {limits ? `${round(limits[0])}–${round(limits[1])} ` : ''}
                  {field.unit}
                </span>
              </span>
              <Input
                type="number"
                size="tiny"
                step={field.step}
                disabled={isSpeed && !form.vfd}
                placeholder={String(current)}
                value={form.edits[field.k] ?? String(current)}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    edits: { ...form.edits, [field.k]: event.target.value },
                  })
                }
              />
            </label>
          )
        })}
        <label className="flex items-center justify-between text-sm text-foreground-light">
          Variable-speed drive
          <Switch checked={form.vfd} onCheckedChange={(vfd) => onFormChange({ ...form, vfd })} />
        </label>
      </Section>

      <Section title="Faults">
        {meta.faults.map((fault) => {
          const value = form.faults[fault.key] ?? 0
          return (
            <div key={fault.key} className="flex flex-col gap-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-light">{fault.label}</span>
                <span>{value}</span>
              </div>
              <input
                type="range"
                aria-label={fault.label}
                className="w-full accent-brand"
                min={0}
                max={fault.max}
                step={fault.step}
                value={value}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    faults: { ...form.faults, [fault.key]: Number(event.target.value) },
                  })
                }
              />
            </div>
          )
        })}
      </Section>

      <div className="flex gap-x-2 px-4 py-3">
        <Button
          className="flex-1"
          variant="primary"
          icon={<Play size={14} />}
          loading={isRunning}
          onClick={onRun}
        >
          Run scenario
        </Button>
        <Button
          className="flex-1"
          variant="default"
          icon={<RotateCcw size={14} />}
          onClick={onReset}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
