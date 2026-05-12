import type { ReactNode } from "react"

/** Vietnamese executive summary block (AR Tracer style). */
export function KetLuanBlock({ children }: { children: ReactNode }) {
  return (
    <section className="border-primary/30 bg-primary/5 rounded-lg border p-4">
      <h3 className="mb-2 text-sm font-semibold tracking-wide uppercase">Kết luận</h3>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  )
}
