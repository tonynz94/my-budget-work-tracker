// A date in this app is a YYYY-MM-DD string. These helpers do the date math in UTC,
// so the time zone of the device can not move a date.

const DAY_MS = 86_400_000

function toTime(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function fromTime(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

export function makeDate(year: number, month: number, day: number): string {
  return fromTime(Date.UTC(year, month - 1, day))
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4))
}

export function addDays(date: string, days: number): string {
  return fromTime(toTime(date) + days * DAY_MS)
}

// How many days it is from one date to a later date.
export function daysBetween(from: string, to: string): number {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS)
}

// Monday is 0 and Sunday is 6.
export function weekday(date: string): number {
  return (new Date(toTime(date)).getUTCDay() + 6) % 7
}

// The Monday of the week.
export function weekStart(date: string): string {
  return addDays(date, -weekday(date))
}

export function monthStart(date: string): string {
  return date.slice(0, 8) + '01'
}

export function addMonths(date: string, months: number): string {
  const [year, month] = date.split('-').map(Number)
  return fromTime(Date.UTC(year, month - 1 + months, 1))
}

// The weeks that cover a month. Each week has 7 dates and starts on Monday.
export function monthGrid(month: string): string[][] {
  const lastDay = addDays(addMonths(month, 1), -1)
  const weeks: string[][] = []
  for (let monday = weekStart(month); monday <= lastDay; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)))
  }
  return weeks
}

export function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-NZ', { ...options, timeZone: 'UTC' }).format(new Date(toTime(date)))
}
