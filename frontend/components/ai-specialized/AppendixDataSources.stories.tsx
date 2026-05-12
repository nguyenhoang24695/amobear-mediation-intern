import type { Meta, StoryObj } from "@storybook/nextjs"
import { AppendixDataSources } from "./AppendixDataSources"

const meta = {
  title: "AI Specialized/AppendixDataSources",
  component: AppendixDataSources,
  tags: ["autodocs"],
} satisfies Meta<typeof AppendixDataSources>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    sources: [
      { name: "ds_unified_revenue", layer: "Silver" },
      { name: "ds_app_pnl", layer: "Gold" },
    ],
  },
}
