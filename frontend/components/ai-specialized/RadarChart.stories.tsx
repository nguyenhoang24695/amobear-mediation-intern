import type { Meta, StoryObj } from "@storybook/nextjs"
import { RadarChart } from "./RadarChart"

const meta = {
  title: "AI Specialized/RadarChart",
  component: RadarChart,
  tags: ["autodocs"],
} satisfies Meta<typeof RadarChart>

export default meta
type Story = StoryObj<typeof meta>

const sample = [
  { label: "Retain", value: 78 },
  { label: "Monetize", value: 62 },
  { label: "Growth", value: 55 },
  { label: "Quality", value: 81 },
]

export const Default: Story = {
  args: { data: sample, max: 100 },
}

export const TooFewDimensions: Story = {
  args: { data: [{ label: "A", value: 50 }], max: 100 },
}
