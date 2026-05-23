export const PINNED_CUSTOM_REPORTS_CHANGED_EVENT = "pinned-custom-reports-changed"

export function notifyPinnedCustomReportsChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(PINNED_CUSTOM_REPORTS_CHANGED_EVENT))
}
