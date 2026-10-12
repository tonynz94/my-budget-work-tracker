import { expect, test } from 'vitest'
import { nzDate } from './nzTime'

test('summer time is 13 hours ahead of UTC', () => {
  expect(nzDate(new Date('2026-10-12T10:59:00Z'))).toBe('2026-10-12')
  expect(nzDate(new Date('2026-10-12T11:00:00Z'))).toBe('2026-10-13')
})

test('winter time is 12 hours ahead of UTC', () => {
  expect(nzDate(new Date('2026-07-01T11:59:00Z'))).toBe('2026-07-01')
  expect(nzDate(new Date('2026-07-01T12:00:00Z'))).toBe('2026-07-02')
})
