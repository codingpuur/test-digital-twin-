import { Button } from 'ui'

import type { PumpLayer, PumpLayerInfo } from '@/data/twin/pump-types'

type PumpLayerPickerProps = {
  layers: PumpLayerInfo[]
  activeKey: string | null
  /** The loaded values of the active layer; its scale and range are shown as the legend. */
  active: PumpLayer | null
  isLoading: boolean
  onChange: (key: string | null) => void
}

const formatLimit = (value: number) => Number(value.toPrecision(3)).toString()

/** Picks which result the 3D pump shows (cavitation, stress, thermal …). The values come from the backend. */
export const PumpLayerPicker = ({
  layers,
  activeKey,
  active,
  isLoading,
  onChange,
}: PumpLayerPickerProps) => {
  if (layers.length === 0) return null
  const info = layers.find((layer) => layer.key === activeKey)

  return (
    <div className="flex max-w-[460px] flex-col gap-y-1.5">
      <div role="group" aria-label="3D result layer" className="flex flex-wrap gap-1">
        <Button
          size="tiny"
          variant={activeKey === null ? 'primary' : 'default'}
          aria-pressed={activeKey === null}
          onClick={() => onChange(null)}
        >
          Parts
        </Button>
        {layers.map((layer) => (
          <Button
            key={layer.key}
            size="tiny"
            variant={activeKey === layer.key ? 'primary' : 'default'}
            aria-pressed={activeKey === layer.key}
            loading={isLoading && activeKey === layer.key}
            onClick={() => onChange(activeKey === layer.key ? null : layer.key)}
          >
            {layer.key.charAt(0).toUpperCase() + layer.key.slice(1)}
          </Button>
        ))}
      </div>
      {info && (
        <div className="flex flex-col gap-y-1 text-foreground-light">
          <span className="text-foreground">{info.title}</span>
          <div className="flex items-center gap-x-2">
            <span>{formatLimit(info.lo)}</span>
            <span
              className="h-2 flex-1 rounded-full"
              style={{
                background: `linear-gradient(to right, ${info.scale
                  .map(([position, color]) => `${color} ${position * 100}%`)
                  .join(', ')})`,
              }}
            />
            <span>{formatLimit(info.hi)}</span>
            <span className="text-foreground-lighter">{info.unit}</span>
          </div>
          <details className="text-foreground-lighter">
            <summary className="cursor-pointer text-foreground-light">About this layer</summary>
            <p className="mt-1 max-h-32 overflow-y-auto">{info.about}</p>
          </details>
          {active === null && <p className="text-foreground-lighter">Loading values…</p>}
        </div>
      )}
    </div>
  )
}
