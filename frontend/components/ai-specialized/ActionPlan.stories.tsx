import type { Meta, StoryObj } from "@storybook/nextjs"
import { ActionPlan } from "./ActionPlan"

const meta = {
  title: "AI Specialized/ActionPlan",
  component: ActionPlan,
  tags: ["autodocs"],
} satisfies Meta<typeof ActionPlan>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: [
      { id: "1", title: "Tighten waterfall for tier-1 GEO", owner: "UA", due: "Fri" },
      { id: "2", title: "A/B test interstitial cap", owner: "Product" },
    ],
  },
}
