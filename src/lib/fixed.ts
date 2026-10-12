import { addDays, addMonths, daysBetween, monthStart } from './dates'

export type Repeat = 'weekly' | 'fortnightly' | 'monthly'

// A cost that comes back, like rent or the phone bill.
export type FixedCost = {
  id: string
  name: string
  cents: number
  category: string
  repeat: Repeat
  start: string
  // Null means it never ends.
  end: string | null
  // The app already made the records up to this date.
  doneThrough: string | null
}

export const repeatLabels: Record<Repeat, string> = {
  weekly: 'Every week',
  fortnightly: 'Every 2 weeks',
  monthly: 'Every month',
}

// The dates this cost is paid, from one date to another date. Both ends are included.
export function occurrences(fixed: Pick<FixedCost, 'repeat' | 'start' | 'end'>, from: string, to: string): string[] {
  const first = from > fixed.start ? from : fixed.start
  const last = fixed.end && fixed.end < to ? fixed.end : to
  const dates: string[] = []

  if (fixed.repeat !== 'monthly') {
    const step = fixed.repeat === 'weekly' ? 7 : 14
    const skip = Math.ceil(daysBetween(fixed.start, first) / step)
    for (let date = addDays(fixed.start, skip * step); date <= last; date = addDays(date, step)) dates.push(date)
    return dates
  }

  // A month can be too short for the day, for example the 31st. Then the cost is on the last day of the month.
  const day = Number(fixed.start.slice(8))
  for (let month = monthStart(fixed.start); month <= last; month = addMonths(month, 1)) {
    const lastDay = Number(addDays(addMonths(month, 1), -1).slice(8))
    const date = month.slice(0, 8) + String(Math.min(day, lastDay)).padStart(2, '0')
    if (date >= first && date <= last) dates.push(date)
  }
  return dates
}
