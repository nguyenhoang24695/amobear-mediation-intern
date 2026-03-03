type ActivityLogLinkValue = string | number | null | undefined

export function buildActivityLogsHref(params?: Record<string, ActivityLogLinkValue>) {
  const searchParams = new URLSearchParams()

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value == null || value === "") return
    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `/activity-logs?${query}` : "/activity-logs"
}
