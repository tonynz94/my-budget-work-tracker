import { addDays, daysBetween } from './dates'
import { paidMinutes } from './work'
import type { WorkEntry } from './work'

// 'gross' is before tax and 'net' is after tax.
export type RateMode = 'gross' | 'net'

// A new hourly rate starts from a date. Older records keep the rate they had.
export type RateChange = { from: string; cents: number; mode: RateMode }

// A pay cycle starts from a Monday. The payday is some days after the period ends.
export type PayCycle = { from: string; weeks: 1 | 2; paydayOffset: number }

export const defaultCycle: PayCycle = { from: '2026-09-21', weeks: 2, paydayOffset: 4 }

export type PayPeriod = {
  start: string
  end: string
  payday: string
  // How many of these periods fit in a year. It is 26 for 2 weeks and 52 for 1 week.
  perYear: number
}

// The upper limit is in dollars a year and the rate is in percent. Null means no upper limit.
export type TaxBracket = { upTo: number | null; rate: number }

export type TaxSettings = { brackets: TaxBracket[]; accRate: number }

// IRD rates from 1 April 2025. I checked them on ird.govt.nz in October 2026.
export const defaultBrackets: TaxBracket[] = [
  { upTo: 15600, rate: 10.5 },
  { upTo: 53500, rate: 17.5 },
  { upTo: 78100, rate: 30 },
  { upTo: 180000, rate: 33 },
  { upTo: null, rate: 39 },
]

// ACC earner's levy for 1 April 2026 to 31 March 2027, in percent.
export const DEFAULT_ACC_RATE = 1.75

function sortedCycles(cycles: PayCycle[]): PayCycle[] {
  return cycles.length > 0 ? [...cycles].sort((a, b) => a.from.localeCompare(b.from)) : [defaultCycle]
}

// The pay cycle that is used on this date.
export function cycleOn(date: string, cycles: PayCycle[]): PayCycle {
  const list = sortedCycles(cycles)
  let best = list[0]
  for (const cycle of list) {
    if (cycle.from <= date) best = cycle
  }
  return best
}

// The pay period that has this date in it.
export function periodFor(date: string, cycles: PayCycle[]): PayPeriod {
  const list = sortedCycles(cycles)
  let index = 0
  for (let i = 0; i < list.length; i++) {
    if (list[i].from <= date) index = i
  }
  const cycle = list[index]
  const next = list[index + 1]

  const length = cycle.weeks * 7
  const count = Math.floor(daysBetween(cycle.from, date) / length)
  const start = addDays(cycle.from, count * length)
  let end = addDays(start, length - 1)
  // A new cycle cuts the old period short if it starts in the middle of it.
  if (next && next.from <= end) end = addDays(next.from, -1)

  const days = daysBetween(start, end) + 1
  return { start, end, payday: addDays(end, cycle.paydayOffset), perYear: 364 / days }
}

// The period that gets paid next. This can be a period that already ended.
export function nextPaidPeriod(today: string, cycles: PayCycle[]): PayPeriod {
  let best = periodFor(today, cycles)
  for (let i = 0; i < 8; i++) {
    const earlier = periodFor(addDays(best.start, -1), cycles)
    if (earlier.payday < today) break
    best = earlier
  }
  return best
}

// The hourly rate on a date. A date before the first rate uses the first rate.
export function rateOn(date: string, rates: RateChange[]): RateChange | null {
  let best: RateChange | null = null
  let first: RateChange | null = null
  for (const rate of rates) {
    if (!first || rate.from < first.from) first = rate
    if (rate.from <= date && (!best || rate.from > best.from)) best = rate
  }
  return best ?? first
}

// Income tax for one year. The input and the result are in cents.
export function annualTax(annualCents: number, brackets: TaxBracket[]): number {
  let tax = 0
  let lower = 0
  for (const bracket of brackets) {
    const upper = bracket.upTo === null ? Infinity : bracket.upTo * 100
    if (annualCents > lower) tax += ((Math.min(annualCents, upper) - lower) * bracket.rate) / 100
    lower = upper
  }
  return tax
}

export type PayDay = {
  entry: WorkEntry
  minutes: number
  // The money for this day at the hourly rate. It is before tax or after tax, like the rate.
  cents: number
}

export type PeriodPay = {
  days: PayDay[]
  paidMin: number
  // The paid minutes where a worked public holiday counts 1.5 times.
  weightedMin: number
  // 'none' means there is no hourly rate yet. 'mixed' means the rate type changed inside the period.
  mode: RateMode | 'mixed' | 'none'
  // Null when the rate is after tax, because then there is no before-tax number.
  grossCents: number | null
  payeCents: number
  accCents: number
  netCents: number
}

export function periodPay(
  period: PayPeriod,
  entries: ReadonlyMap<string, WorkEntry>,
  rates: RateChange[],
  holidayMultiplier: number,
  tax: TaxSettings,
): PeriodPay {
  const days: PayDay[] = []
  let paidMin = 0
  let weightedMin = 0
  let grossPart = 0
  let netPart = 0

  for (let date = period.start; date <= period.end; date = addDays(date, 1)) {
    const entry = entries.get(date)
    if (!entry) continue
    const minutes = paidMinutes(entry)
    const factor = entry.kind === 'holiday_worked' ? holidayMultiplier : 1
    const rate = rateOn(date, rates)
    const cents = rate ? (minutes / 60) * rate.cents * factor : 0
    if (rate?.mode === 'gross') grossPart += cents
    else netPart += cents
    paidMin += minutes
    weightedMin += minutes * factor
    days.push({ entry, minutes, cents })
  }

  let mode: PeriodPay['mode']
  if (rates.length === 0) mode = 'none'
  else if (grossPart > 0 && netPart > 0) mode = 'mixed'
  else if (grossPart > 0) mode = 'gross'
  else if (netPart > 0) mode = 'net'
  else mode = rateOn(period.start, rates)?.mode ?? 'none'

  // PAYE. Turn the period into a full year, find the tax for the year, then go back to one period.
  const paye = annualTax(grossPart * period.perYear, tax.brackets) / period.perYear
  const acc = (grossPart * tax.accRate) / 100

  // The amounts stay exact until here. They are rounded to cents one time.
  return {
    days,
    paidMin,
    weightedMin,
    mode,
    grossCents: mode === 'gross' ? Math.round(grossPart) : null,
    payeCents: Math.round(paye),
    accCents: Math.round(acc),
    netCents: Math.round(netPart + grossPart - paye - acc),
  }
}

// The real after-tax hourly rate, from the money that came in.
export function actualHourlyCents(actualCents: number, weightedMin: number): number | null {
  return weightedMin > 0 ? Math.round(actualCents / (weightedMin / 60)) : null
}
