import type { DateRangeType } from '@/types/api'
import type { DateRangePreset } from '@/contexts/dashboard-date-context'

/**
 * Map frontend DateRangePreset to backend DateRangeType
 */
export function mapPresetToDateRangeType(preset: DateRangePreset): DateRangeType {
  switch (preset) {
    case 'today':
      return 'today'
    case '7days':
      return 'last7days'
    case '30days':
      return 'last30days'
    case 'custom':
      return 'custom'
    default:
      return 'today'
  }
}

/**
 * Format date to ISO string (YYYY-MM-DD) in local timezone
 * This ensures the date doesn't shift due to UTC conversion
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
