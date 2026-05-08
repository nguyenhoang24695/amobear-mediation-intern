import type { Meta, StoryObj } from "@storybook/nextjs"
import { KetLuanBlock } from "./KetLuanBlock"

const meta = {
  title: "AI Specialized/KetLuanBlock",
  component: KetLuanBlock,
  tags: ["autodocs"],
} satisfies Meta<typeof KetLuanBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <KetLuanBlock>
      Doanh thu ổn định nhưng chi phí UA tăng; ưu tiên tối ưu eCPM theo placement trước khi scale.
    </KetLuanBlock>
  ),
}
