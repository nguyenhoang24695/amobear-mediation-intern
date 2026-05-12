import type { Meta, StoryObj } from "@storybook/nextjs"
import { HealthScoreCard } from "./HealthScoreCard"

const meta = {
  title: "AI Specialized/HealthScoreCard",
  component: HealthScoreCard,
  tags: ["autodocs"],
} satisfies Meta<typeof HealthScoreCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    score: 72.3,
    tier: "Good",
    subtitle: "7d vs prior 7d",
  },
}
