import type { Meta, StoryObj } from "@storybook/nextjs"
import { UnifiedReport } from "./UnifiedReport"

const meta = {
  title: "AI Specialized/UnifiedReport",
  component: UnifiedReport,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof UnifiedReport>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: "Demo app — weekly agent report",
    healthScore: 68.4,
    healthTier: "Fair",
    radar: [
      { label: "Retain", value: 70 },
      { label: "Monetize", value: 62 },
      { label: "Quality", value: 74 },
      { label: "Growth", value: 58 },
    ],
    dimensions: [
      { key: "d1", label: "Session depth", score: 64, note: "Stable WoW" },
      { key: "d2", label: "Ad load vs UX", score: 71 },
    ],
    actions: [
      { id: "a1", title: "Review high-frequency interstitial on level 5–8", owner: "Mediation" },
      { id: "a2", title: "Trim paid UA in tier-3 GEO until D7 improves", owner: "UA", due: "Next sprint" },
    ],
    sources: [
      { name: "gold.fact_daily_app_metrics", layer: "Gold" },
      { name: "silver.daily_app_revenue", layer: "Silver" },
    ],
    ketLuan: "Tổng thể ổn; rủi ro chính là tỷ suất lợi nhuận UA khi scale — cần giữ cap chi phí theo cohort.",
  },
}
