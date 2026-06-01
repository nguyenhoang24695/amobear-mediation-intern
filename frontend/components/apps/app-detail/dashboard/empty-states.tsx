/**
 * Empty state blocks dùng chung cho PO Dashboard. Slice 1 chỉ định nghĩa
 * — slice sau import từ đây khi gặp warning tương ứng từ BE response.
 * Xem docs/po-dashboard-metric/04_Implementation_Guide.md §5.8.
 */

export function AdjustNotConfigured() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Adjust account is not configured for this app — install, revenue, ROAS and Adjust retention
      are unavailable.
    </div>
  )
}

export function AdjustAdRevenueMissing() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Adjust ad_revenue tracking is not enabled for this app — IAA revenue may be missing.
    </div>
  )
}

export function AdjustDelayed() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      Adjust syncs daily (T+1). Try <strong>Yesterday</strong> or <strong>Last 7 days</strong>.
    </div>
  )
}

export function FirebaseNotConfigured() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      Firebase data is not configured for this app.
    </div>
  )
}

export function QonversionNotConfigured() {
  return (
    <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-800">
      Qonversion IAP/SUB data is not configured for this app.
    </div>
  )
}

export function NoData({ label }: { label: string }) {
  return <div className="text-sm text-slate-500 py-8 text-center">{label}</div>
}
