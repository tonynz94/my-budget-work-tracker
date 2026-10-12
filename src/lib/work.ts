import { addDays } from './dates'
import type { Holiday } from './holidays'

export type WorkKind = 'regular' | 'holiday_worked' | 'holiday_not_worked'

export const kindLabels: Record<WorkKind, string> = {
  regular: 'Regular',
  holiday_worked: 'Public holiday worked',
  holiday_not_worked: 'Public holiday not worked',
}

// One work record for one day. Times are minutes from midnight.
// An entry has start and end, or it has a total. It never has both.
export type WorkEntry = {
  date: string
  kind: WorkKind
  startMin: number | null
  endMin: number | null
  totalMin: number | null
  breakMin: number
  note: string
}

export type Vacation = { id: string; start: string; end: string }

// A new weekly limit starts from a Monday. Older weeks keep the limit they had.
export type LimitChange = { fromWeek: string; minutes: number }

export const DEFAULT_LIMIT_MIN = 25 * 60

// The minutes I get paid for. The unpaid break is not included.
export function paidMinutes(entry: WorkEntry): number {
  const length =
    entry.startMin !== null && entry.endMin !== null ? entry.endMin - entry.startMin : (entry.totalMin ?? 0)
  return Math.max(0, length - entry.breakMin)
}

// The minutes I really worked. A paid holiday off is paid but it is 0 hours of work.
export function workedMinutes(entry: WorkEntry): number {
  return entry.kind === 'holiday_not_worked' ? 0 : paidMinutes(entry)
}

export function isVacationDay(date: string, vacations: Vacation[]): boolean {
  return vacations.some((vacation) => vacation.start <= date && date <= vacation.end)
}

export function limitForWeek(week: string, limits: LimitChange[]): number {
  let best: LimitChange | null = null
  for (const change of limits) {
    if (change.fromWeek <= week && (!best || change.fromWeek > best.fromWeek)) best = change
  }
  return best ? best.minutes : DEFAULT_LIMIT_MIN
}

export type WeekStatus = 'ok' | 'warn' | 'over' | 'none'

export type WeekSummary = {
  // All the minutes I worked this week.
  worked: number
  // The minutes that count for the visa limit. Work on vacation days does not count.
  counted: number
  limit: number
  left: number
  // 'none' means the whole week is vacation, so there is no limit.
  status: WeekStatus
}

export function weekSummary(
  week: string,
  entries: ReadonlyMap<string, WorkEntry>,
  vacations: Vacation[],
  limits: LimitChange[],
): WeekSummary {
  let worked = 0
  let counted = 0
  let vacationDays = 0
  for (let i = 0; i < 7; i++) {
    const date = addDays(week, i)
    const vacation = isVacationDay(date, vacations)
    if (vacation) vacationDays++
    const entry = entries.get(date)
    if (!entry) continue
    const minutes = workedMinutes(entry)
    worked += minutes
    if (!vacation) counted += minutes
  }
  const limit = limitForWeek(week, limits)
  let status: WeekStatus = 'ok'
  if (vacationDays === 7) status = 'none'
  else if (counted > limit) status = 'over'
  else if (counted > limit * 0.8) status = 'warn'
  return { worked, counted, limit, left: limit - counted, status }
}

// The kind a new entry starts with. A holiday starts as "Public holiday worked".
// It stays regular if the other date of the same holiday already has a holiday record.
export function defaultKind(
  date: string,
  holidays: ReadonlyMap<string, Holiday>,
  entries: ReadonlyMap<string, WorkEntry>,
): WorkKind {
  const holiday = holidays.get(date)
  if (!holiday) return 'regular'
  for (const other of holidays.values()) {
    if (other.group !== holiday.group || other.date === date) continue
    if (entries.get(other.date)?.kind === 'holiday_worked') return 'regular'
  }
  return 'holiday_worked'
}
