import type { Meta, StoryObj } from "@storybook/nextjs"
import { DimensionTable } from "./DimensionTable"

const meta = {
  title: "AI Specialized/DimensionTable",
  component: DimensionTable,
  tags: ["autodocs"],
} satisfies Meta<typeof DimensionTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    rows: [
      { key: "1", label: "Retention D1", score: 42, note: "Below category median" },
      { key: "2", label: "ARPDAU", score: 71 },
    ],
  },
}
