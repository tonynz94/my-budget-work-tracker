import { expect, test } from 'vitest'
import { holidayMap, nzHolidays } from './holidays'

function dateOf(year: number, name: string): string | undefined {
  return nzHolidays(year).find((holiday) => holiday.name === name)?.date
}

test('2026 holidays have the right dates', () => {
  expect(dateOf(2026, "New Year's Day")).toBe('2026-01-01')
  expect(dateOf(2026, "Day after New Year's Day")).toBe('2026-01-02')
  expect(dateOf(2026, 'Auckland Anniversary Day')).toBe('2026-01-26')
  expect(dateOf(2026, 'Waitangi Day')).toBe('2026-02-06')
  expect(dateOf(2026, 'Good Friday')).toBe('2026-04-03')
  expect(dateOf(2026, 'Easter Monday')).toBe('2026-04-06')
  expect(dateOf(2026, "King's Birthday")).toBe('2026-06-01')
  expect(dateOf(2026, 'Matariki')).toBe('2026-07-10')
  expect(dateOf(2026, 'Labour Day')).toBe('2026-10-26')
  expect(dateOf(2026, 'Christmas Day')).toBe('2026-12-25')
})

test('a holiday on a weekend shows the original date and the moved date', () => {
  // ANZAC Day 2026 is a Saturday and Boxing Day 2026 is a Saturday.
  expect(dateOf(2026, 'ANZAC Day')).toBe('2026-04-25')
  expect(dateOf(2026, 'ANZAC Day (observed)')).toBe('2026-04-27')
  expect(dateOf(2026, 'Boxing Day')).toBe('2026-12-26')
  expect(dateOf(2026, 'Boxing Day (observed)')).toBe('2026-12-28')
  expect(dateOf(2026, 'Christmas Day (observed)')).toBeUndefined()
})

test('Christmas on Saturday moves to Monday and Boxing Day moves to Tuesday', () => {
  expect(dateOf(2027, 'Christmas Day (observed)')).toBe('2027-12-27')
  expect(dateOf(2027, 'Boxing Day (observed)')).toBe('2027-12-28')
})

test('a single holiday on Sunday moves to Monday', () => {
  // ANZAC Day 2027 is a Sunday and Waitangi Day 2027 is a Saturday.
  expect(dateOf(2027, 'ANZAC Day (observed)')).toBe('2027-04-26')
  expect(dateOf(2027, 'Waitangi Day (observed)')).toBe('2027-02-08')
})

test('New Year on Sunday moves to Tuesday because Monday is already a holiday', () => {
  expect(dateOf(2023, "New Year's Day (observed)")).toBe('2023-01-03')
  expect(dateOf(2023, "Day after New Year's Day (observed)")).toBeUndefined()
})

test('the two dates of one holiday share a group', () => {
  const anzac = nzHolidays(2026).filter((holiday) => holiday.group === '2026-anzac')
  expect(anzac.map((holiday) => holiday.date)).toEqual(['2026-04-25', '2026-04-27'])
})

test('I can remove a holiday and add my own', () => {
  const map = holidayMap([2026], [{ date: '2026-11-02', name: 'Shop closed' }], ['2026-10-26'])
  expect(map.has('2026-10-26')).toBe(false)
  expect(map.get('2026-11-02')?.name).toBe('Shop closed')
  expect(map.get('2026-07-10')?.name).toBe('Matariki')
})
