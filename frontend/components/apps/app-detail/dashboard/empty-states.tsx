/**
 * Empty state blocks dùng chung cho PO Dashboard. Slice 1 chỉ định nghĩa
 * — slice sau import từ đây khi gặp warning tương ứng từ BE response.
 * Xem docs/po-dashboard-metric/04_Implementation_Guide.md §5.8.
 */

export function AdjustNotConfigured() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
      Adjust account is not configured for this app — install, revenue, ROAS and Adjust retention are unavailable.
    </div>
  )
}

export function AdjustAdRevenueMissing() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
      Adjust ad_revenue tracking is not enabled for this app — IAA revenue may be missing.
    </div>
  )
}

export function AdjustDelayed() {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
      Adjust syncs daily (T+1). Try <strong>Yesterday</strong> or <strong>Last 7 days</strong>.
    </div>
  )
}

export function FirebaseNotConfigured() {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-200">
      Firebase data is not configured for this app.
    </div>
  )
}

export function QonversionNotConfigured() {
  return (
    <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-800 dark:text-fuchsia-200">
      Qonversion IAP/SUB data is not configured for this app.
    </div>
  )
}

export function NoData({ label }: { label: string }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{label}</div>
}
