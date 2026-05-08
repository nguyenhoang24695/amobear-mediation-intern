import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type HealthScoreCardProps = {
  title?: string
  score: number
  tier?: string
  subtitle?: string
}

/** Shared report widget — used by App Insight & agent reports. */
export function HealthScoreCard({ title = "Health", score, tier, subtitle }: HealthScoreCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {tier && <p className="text-muted-foreground text-xs uppercase">{tier}</p>}
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-semibold tabular-nums">{score.toFixed(1)}</div>
        {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
