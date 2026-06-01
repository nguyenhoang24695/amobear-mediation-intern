export function enumerateDateStrings(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = parseDate(start)
  const last = parseDate(end)
  while (cursor <= last) {
    dates.push(formatDate(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

export function mapPoints<T extends { date: string }>(points: T[]): Map<string, T> {
  return new Map(points.map((point) => [point.date, point]))
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10)
}
