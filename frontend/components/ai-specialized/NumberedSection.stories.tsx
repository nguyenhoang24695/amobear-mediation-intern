import type { Meta, StoryObj } from "@storybook/nextjs"
import { NumberedSection } from "./NumberedSection"

const meta = {
  title: "AI Specialized/NumberedSection",
  component: NumberedSection,
  tags: ["autodocs"],
} satisfies Meta<typeof NumberedSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    index: 1,
    title: "Dimension breakdown",
  },
  render: (args) => (
    <NumberedSection {...args}>
      <p className="text-foreground">Nội dung mục con.</p>
    </NumberedSection>
  ),
}
