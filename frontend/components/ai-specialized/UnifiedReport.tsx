import type { ReactNode } from "react"
import { HealthScoreCard } from "./HealthScoreCard"
import { RadarChart } from "./RadarChart"
import { DimensionTable, type DimensionRow } from "./DimensionTable"
import { ActionPlan, type ActionItem } from "./ActionPlan"
import { AppendixDataSources } from "./AppendixDataSources"
import { KetLuanBlock } from "./KetLuanBlock"
import { NumberedSection } from "./NumberedSection"

export type UnifiedReportProps = {
  title: string
  healthScore: number
  healthTier?: string
  radar: { label: string; value: number }[]
  dimensions: DimensionRow[]
  actions: ActionItem[]
  sources: { name: string; layer: string }[]
  ketLuan: ReactNode
}

export function UnifiedReport(p: UnifiedReportProps) {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{p.title}</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <HealthScoreCard score={p.healthScore} tier={p.healthTier} />
        <div className="flex items-center justify-center">
          <RadarChart data={p.radar} />
        </div>
      </div>
      <KetLuanBlock>{p.ketLuan}</KetLuanBlock>
      <NumberedSection index={1} title="Dimension breakdown">
        <DimensionTable rows={p.dimensions} />
      </NumberedSection>
      <NumberedSection index={2} title="Action plan">
        <ActionPlan items={p.actions} />
      </NumberedSection>
      <NumberedSection index={3} title="Appendix">
        <AppendixDataSources sources={p.sources} />
      </NumberedSection>
    </article>
  )
}
