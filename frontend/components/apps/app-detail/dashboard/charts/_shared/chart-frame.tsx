import { Button } from "@/components/ui/button"

export interface ChartLegendItem {
  key: string
  label: string
  color: string
}

export function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-4" style={{ height }}>
      <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export function ChartError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <section className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-card to-background p-4 text-sm text-foreground shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Could not load {title}</p>
          <p className="mt-1 text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" size="sm" className="bg-background/80" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </section>
  )
}

export function LegendItems({ items, className = "mt-3" }: { items: readonly ChartLegendItem[]; className?: string }) {
  return (
    <div className={`${className} flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground`}>
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
