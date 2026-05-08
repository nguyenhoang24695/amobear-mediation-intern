import type { ReactNode } from "react"

export function NumberedSection({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-baseline gap-2 text-lg font-semibold">
        <span className="text-muted-foreground tabular-nums">{index}.</span>
        {title}
      </h3>
      <div className="text-muted-foreground space-y-2 pl-7 text-sm">{children}</div>
    </section>
  )
}
