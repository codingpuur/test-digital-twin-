type TrendChartProps = {
  values: number[]
  limit?: number
}

const WIDTH = 260
const HEIGHT = 56

export const TrendChart = ({ values, limit }: TrendChartProps) => {
  if (values.length < 2) return null
  const top = Math.max(...values, limit ?? 0) * 1.1 || 1
  const y = (value: number) => HEIGHT - (value / top) * HEIGHT
  const points = values
    .map(
      (value, index) =>
        `${((index / (values.length - 1)) * WIDTH).toFixed(1)},${y(value).toFixed(1)}`
    )
    .join(' ')

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-14 w-full" aria-hidden="true">
      {limit !== undefined && (
        <line
          x1="0"
          x2={WIDTH}
          y1={y(limit)}
          y2={y(limit)}
          stroke="currentColor"
          strokeDasharray="4 4"
          className="text-destructive"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-warning"
      />
    </svg>
  )
}
