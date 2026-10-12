import { expect, test } from 'vitest'
import { holidayMap } from './holidays'
import { defaultKind, limitForWeek, paidMinutes, weekSummary, workedMinutes } from './work'
import type { WorkEntry } from './work'

function range(date: string, start: string, end: string, breakMin = 0, kind: WorkEntry['kind'] = 'regular'): WorkEntry {
  const toMin = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3))
  return { date, kind, startMin: toMin(start), endMin: toMin(end), totalMin: null, breakMin, note: '' }
}

function total(date: string, minutes: number, breakMin = 0, kind: WorkEntry['kind'] = 'regular'): WorkEntry {
  return { date, kind, startMin: null, endMin: null, totalMin: minutes, breakMin, note: '' }
}

function mapOf(...entries: WorkEntry[]): Map<string, WorkEntry> {
  return new Map(entries.map((entry) => [entry.date, entry]))
}

test('start and end minus the unpaid break', () => {
  expect(paidMinutes(range('2026-10-12', '09:00', '15:13', 60))).toBe(313)
})

test('total hours minus the unpaid break', () => {
  expect(paidMinutes(total('2026-10-12', 8 * 60, 60))).toBe(420)
})

test('a paid holiday off is paid but it is 0 hours of work', () => {
  const entry = total('2026-10-26', 5 * 60, 0, 'holiday_not_worked')
  expect(paidMinutes(entry)).toBe(300)
  expect(workedMinutes(entry)).toBe(0)
})

test('a worked public holiday counts the real hours for the visa', () => {
  expect(workedMinutes(range('2026-10-26', '09:00', '14:00', 0, 'holiday_worked'))).toBe(300)
})

// The week of Monday 12 October 2026.
const week = '2026-10-12'

test('the week adds up the hours and shows the hours left', () => {
  const entries = mapOf(range('2026-10-12', '09:00', '15:00', 60), range('2026-10-14', '09:00', '15:00', 60))
  const summary = weekSummary(week, entries, [], [])
  expect(summary.worked).toBe(600)
  expect(summary.counted).toBe(600)
  expect(summary.limit).toBe(1500)
  expect(summary.left).toBe(900)
  expect(summary.status).toBe('ok')
})

test('more than 80% of the limit is a warning and more than the limit is over', () => {
  // 80% of 25 hours is 20 hours.
  expect(weekSummary(week, mapOf(total('2026-10-12', 20 * 60)), [], []).status).toBe('ok')
  expect(weekSummary(week, mapOf(total('2026-10-12', 20 * 60 + 1)), [], []).status).toBe('warn')
  expect(weekSummary(week, mapOf(total('2026-10-12', 25 * 60)), [], []).status).toBe('warn')
  expect(weekSummary(week, mapOf(total('2026-10-12', 25 * 60 + 1)), [], []).status).toBe('over')
})

test('in a mixed week only the hours on term days count', () => {
  const vacations = [{ id: 'a', start: '2026-10-15', end: '2026-10-30' }]
  const entries = mapOf(total('2026-10-13', 10 * 60), total('2026-10-16', 12 * 60), total('2026-10-17', 12 * 60))
  const summary = weekSummary(week, entries, vacations, [])
  expect(summary.worked).toBe(34 * 60)
  expect(summary.counted).toBe(10 * 60)
  expect(summary.status).toBe('ok')
})

test('a full vacation week has no limit', () => {
  const vacations = [{ id: 'a', start: '2026-10-12', end: '2026-10-18' }]
  const summary = weekSummary(week, mapOf(total('2026-10-13', 40 * 60)), vacations, [])
  expect(summary.counted).toBe(0)
  expect(summary.status).toBe('none')
})

test('a new limit starts from its week and old weeks keep the old limit', () => {
  const limits = [
    { fromWeek: '2025-11-03', minutes: 25 * 60 },
    { fromWeek: '2025-01-06', minutes: 20 * 60 },
  ]
  expect(limitForWeek('2024-12-30', limits)).toBe(25 * 60)
  expect(limitForWeek('2025-10-27', limits)).toBe(20 * 60)
  expect(limitForWeek('2025-11-03', limits)).toBe(25 * 60)
  expect(limitForWeek('2026-10-12', limits)).toBe(25 * 60)
})

test('a new entry on a holiday starts as public holiday worked', () => {
  const holidays = holidayMap([2026], [], [])
  expect(defaultKind('2026-10-26', holidays, new Map())).toBe('holiday_worked')
  expect(defaultKind('2026-10-27', holidays, new Map())).toBe('regular')
})

test('only one date of a moved holiday starts as public holiday worked', () => {
  // ANZAC Day 2026 is Saturday 25 April and the moved date is Monday 27 April.
  const holidays = holidayMap([2026], [], [])
  const saturday = mapOf(range('2026-04-25', '09:00', '14:00', 0, 'holiday_worked'))
  expect(defaultKind('2026-04-27', holidays, saturday)).toBe('regular')
  expect(defaultKind('2026-04-27', holidays, new Map())).toBe('holiday_worked')
})
