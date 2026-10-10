import { Button } from 'ui'

export type ViewStyle = 'model' | 'status' | 'hologram'

const OPTIONS: { value: Exclude<ViewStyle, 'model'>; label: string }[] = [
  { value: 'status', label: 'Colour by status' },
  { value: 'hologram', label: 'Hologram' },
]

type ViewStyleToggleProps = {
  value: ViewStyle
  onChange: (value: ViewStyle) => void
}

/** Switches how the model is drawn. Clicking the active option again goes back to the model's own colours. */
export const ViewStyleToggle = ({ value, onChange }: ViewStyleToggleProps) => (
  <div role="group" aria-label="Model view style" className="flex gap-x-1">
    {OPTIONS.map((option) => (
      <Button
        key={option.value}
        size="tiny"
        variant={value === option.value ? 'primary' : 'default'}
        aria-pressed={value === option.value}
        onClick={() => onChange(value === option.value ? 'model' : option.value)}
      >
        {option.label}
      </Button>
    ))}
  </div>
)
