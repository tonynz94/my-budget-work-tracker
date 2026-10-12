import { addDays } from './dates'

// All dates in this app use New Zealand time, even if the device is in another time zone.
export const NZ_TIME_ZONE = 'Pacific/Auckland'

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: NZ_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const hourFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: NZ_TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
})

// Returns the New Zealand date as YYYY-MM-DD.
export function nzDate(now: Date = new Date()): string {
  return dateFormat.format(now)
}

// The day for the budget. A new day starts at 3 a.m., so money I spend at 1 a.m. is for the day before.
// Work hours do not use this rule.
export function budgetDate(now: Date = new Date()): string {
  const date = nzDate(now)
  return Number(hourFormat.format(now)) < 3 ? addDays(date, -1) : date
}
