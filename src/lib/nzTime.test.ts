import { expect, test } from 'vitest'
import { budgetDate, nzDate } from './nzTime'

test('the budget day changes at 3 a.m. and not at midnight', () => {
  // 13:30 UTC is 2:30 a.m. on 13 October in New Zealand.
  expect(nzDate(new Date('2026-10-12T13:30:00Z'))).toBe('2026-10-13')
  expect(budgetDate(new Date('2026-10-12T13:30:00Z'))).toBe('2026-10-12')
  expect(budgetDate(new Date('2026-10-12T14:00:00Z'))).toBe('2026-10-13')
})

test('summer time is 13 hours ahead of UTC', () => {
  expect(nzDate(new Date('2026-10-12T10:59:00Z'))).toBe('2026-10-12')
  expect(nzDate(new Date('2026-10-12T11:00:00Z'))).toBe('2026-10-13')
})

test('winter time is 12 hours ahead of UTC', () => {
  expect(nzDate(new Date('2026-07-01T11:59:00Z'))).toBe('2026-07-01')
  expect(nzDate(new Date('2026-07-01T12:00:00Z'))).toBe('2026-07-02')
})
