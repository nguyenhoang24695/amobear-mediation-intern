/**
 * Format utils cho PO Dashboard. Tất cả hàm nhận `number | null` và trả "—" khi null.
 * Xem docs/po-dashboard-metric/04_Implementation_Guide.md §5.6.
 */

export function formatCount(n: number | null | undefined): string {
  if (n == null) return "—"
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("en-US")
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null) return "—"
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })
}

export function formatPercent(n: number | null | undefined, digits = 2): string {
  if (n == null) return "—"
  return `${n.toFixed(digits)}%`
}

export function formatMinutes(min: number | null | undefined): string {
  if (min == null) return "—"
  if (min < 60) {
    const m = Math.floor(min)
    const s = Math.round((min - m) * 60)
    return `${m}m ${s}s`
  }
  const h = Math.floor(min / 60)
  const m = Math.round(min - h * 60)
  return `${h}h ${m}m`
}

/**
 * Format số thập phân nhỏ (vd. engaged_sessions_per_user = 2.34).
 */
export function formatDecimal(n: number | null | undefined, digits = 2): string {
  if (n == null) return "—"
  return n.toFixed(digits)
}
