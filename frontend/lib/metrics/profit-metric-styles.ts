export function getNetProfitMargin(
  actualProfit: number | null | undefined,
  actualRevenue: number | null | undefined,
): number | null {
  if (actualProfit == null || actualRevenue == null) return null

  const profit = Number(actualProfit)
  const revenue = Number(actualRevenue)
  if (!Number.isFinite(profit) || !Number.isFinite(revenue)) return null
  if (profit === 0 && revenue === 0) return null
  if (revenue <= 0) return null

  return (profit / revenue) * 100
}

/** Màu theo dấu: âm đỏ, dương xanh, null xám, 0 mặc định. */
export function getSignedMetricClass(value: number | null | undefined): string {
  if (value == null) return "text-slate-500"
  if (value < 0) return "text-red-600 font-medium"
  if (value > 0) return "text-green-600 font-medium"
  return "text-slate-700"
}

export function getActualProfitClass(value: number | null | undefined): string {
  return getSignedMetricClass(value)
}

export function getNetProfitMarginClass(margin: number | null | undefined): string {
  return getSignedMetricClass(margin)
}

/** Completion % — ngưỡng 50% / 80% (Overview Report, v.v.). */
export function getPercentClass(percent: number | null | undefined): string {
  if (percent == null) return "text-slate-500"
  if (percent < 0 || percent < 50) return "text-red-600 font-medium"
  if (percent < 80) return "text-amber-600 font-medium"
  return "text-green-600 font-medium"
}
