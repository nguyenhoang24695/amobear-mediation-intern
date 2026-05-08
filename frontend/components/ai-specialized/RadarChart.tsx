export type RadarDatum = { label: string; value: number }

export type RadarChartProps = {
  data: RadarDatum[]
  max?: number
}

/** Lightweight SVG radar — Storybook-ready; replace with chart lib if needed. */
export function RadarChart({ data, max = 100 }: RadarChartProps) {
  const n = data.length
  if (n < 3) return <p className="text-muted-foreground text-sm">Need ≥3 dimensions for radar.</p>

  const cx = 80
  const cy = 80
  const r = 60
  const pts = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const rr = r * Math.min(1, d.value / max)
    return `${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`
  })

  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40">
      <polygon points={pts.join(" ")} fill="hsl(var(--primary) / 0.35)" stroke="hsl(var(--primary))" strokeWidth={1} />
      {data.map((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        const lx = cx + (r + 12) * Math.cos(angle)
        const ly = cy + (r + 12) * Math.sin(angle)
        return (
          <text key={d.label} x={lx} y={ly} fontSize="8" textAnchor="middle" className="fill-muted-foreground">
            {d.label}
          </text>
        )
      })}
    </svg>
  )
}
