import type { DeliveryTime } from '@/lib/profile'

const DELIVERY_HOUR_BY_SLOT: Record<DeliveryTime, number> = {
  Morning: 9,
  Afternoon: 14,
  Evening: 19,
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

function getLocalParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const values = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value
    }
    return acc
  }, {})

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const local = getLocalParts(date, timeZone)
  const asUtcTimestamp = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
  return asUtcTimestamp - date.getTime()
}

function zonedDateTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone)
  return new Date(utcGuess.getTime() - offsetMs)
}

function addOneLocalDay(year: number, month: number, day: number) {
  const marker = new Date(Date.UTC(year, month - 1, day))
  marker.setUTCDate(marker.getUTCDate() + 1)
  return {
    year: marker.getUTCFullYear(),
    month: marker.getUTCMonth() + 1,
    day: marker.getUTCDate(),
  }
}

export function normalizeDeliveryTime(value: string | null | undefined): DeliveryTime {
  if (value === 'Morning' || value === 'Afternoon' || value === 'Evening') {
    return value
  }
  return 'Morning'
}

export function normalizeTimeZone(value: string | null | undefined): string {
  if (!value) return 'UTC'
  return isValidTimeZone(value) ? value : 'UTC'
}

export function computeNextDeliveryAt(timeZone: string, deliveryTime: DeliveryTime, now = new Date()): string {
  const safeTimeZone = normalizeTimeZone(timeZone)
  const targetHour = DELIVERY_HOUR_BY_SLOT[deliveryTime]
  const localNow = getLocalParts(now, safeTimeZone)

  let year = localNow.year
  let month = localNow.month
  let day = localNow.day

  let scheduledUtc = zonedDateTimeToUtc(year, month, day, targetHour, 0, safeTimeZone)
  if (scheduledUtc.getTime() <= now.getTime()) {
    const nextDay = addOneLocalDay(year, month, day)
    year = nextDay.year
    month = nextDay.month
    day = nextDay.day
    scheduledUtc = zonedDateTimeToUtc(year, month, day, targetHour, 0, safeTimeZone)
  }

  return scheduledUtc.toISOString()
}
