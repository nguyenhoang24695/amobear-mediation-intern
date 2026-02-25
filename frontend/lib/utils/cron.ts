/**
 * Calculate next run time from cron expression
 * Supports standard 5-field cron: minute hour day month weekday
 */

interface CronParts {
  minute: string
  hour: string
  day: string
  month: string
  weekday: string
}

function parseCronExpression(cron: string): CronParts | null {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null
  
  return {
    minute: parts[0],
    hour: parts[1],
    day: parts[2],
    month: parts[3],
    weekday: parts[4],
  }
}

function matchesValue(value: number, pattern: string): boolean {
  if (pattern === "*") return true
  if (pattern === value.toString()) return true
  
  // Handle ranges: 1-5
  if (pattern.includes("-")) {
    const [start, end] = pattern.split("-").map(Number)
    return value >= start && value <= end
  }
  
  // Handle lists: 1,3,5
  if (pattern.includes(",")) {
    return pattern.split(",").map(Number).includes(value)
  }
  
  // Handle step: */5, 0-23/2
  if (pattern.includes("/")) {
    const [range, step] = pattern.split("/")
    const stepNum = Number(step)
    
    if (range === "*") {
      return value % stepNum === 0
    }
    
    if (range.includes("-")) {
      const [start, end] = range.split("-").map(Number)
      if (value >= start && value <= end) {
        return (value - start) % stepNum === 0
      }
      return false
    }
  }
  
  return false
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getDayOfWeek(date: Date): number {
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return date.getDay()
}

export function calculateNextRunTime(
  cronExpression: string,
  timeZoneId: string = "UTC",
  enabled: boolean = true
): Date | null {
  if (!enabled) return null
  
  const parts = parseCronExpression(cronExpression)
  if (!parts) return null
  
  // Get current time in the specified timezone
  const now = new Date()
  
  // For simplicity, we'll work with UTC and adjust
  // In production, you might want to use a timezone library
  let nextRun = new Date(now)
  nextRun.setSeconds(0, 0) // Reset seconds and milliseconds
  
  // Start from next minute
  nextRun.setMinutes(nextRun.getMinutes() + 1)
  
  let attempts = 0
  const maxAttempts = 10000 // Prevent infinite loop
  
  while (attempts < maxAttempts) {
    const year = nextRun.getFullYear()
    const month = nextRun.getMonth() + 1 // 1-12
    const day = nextRun.getDate()
    const hour = nextRun.getHours()
    const minute = nextRun.getMinutes()
    const weekday = getDayOfWeek(nextRun)
    
    // Check if current time matches all cron fields
    const minuteMatch = matchesValue(minute, parts.minute)
    const hourMatch = matchesValue(hour, parts.hour)
    const dayMatch = matchesValue(day, parts.day)
    const monthMatch = matchesValue(month, parts.month)
    const weekdayMatch = matchesValue(weekday, parts.weekday)
    
    if (minuteMatch && hourMatch && dayMatch && monthMatch && weekdayMatch) {
      return nextRun
    }
    
    // Move to next minute
    nextRun.setMinutes(nextRun.getMinutes() + 1)
    
    // Handle day overflow
    if (nextRun.getMinutes() === 0) {
      if (nextRun.getHours() === 0) {
        const daysInMonth = getDaysInMonth(year, month)
        if (nextRun.getDate() > daysInMonth) {
          nextRun.setDate(1)
          nextRun.setMonth(nextRun.getMonth() + 1)
          if (nextRun.getMonth() === 0) {
            nextRun.setFullYear(nextRun.getFullYear() + 1)
          }
        }
      }
    }
    
    attempts++
  }
  
  return null
}

export function formatNextRunTime(
  cronExpression: string,
  timeZoneId: string = "UTC",
  enabled: boolean = true
): string {
  if (!enabled) {
    return "Disabled"
  }
  
  const nextRun = calculateNextRunTime(cronExpression, timeZoneId, enabled)
  
  if (!nextRun) {
    return "Unable to calculate"
  }
  
  // Format: "Jan 15, 2025 at 2:30 PM"
  return nextRun.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

