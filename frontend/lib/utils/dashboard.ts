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
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}
