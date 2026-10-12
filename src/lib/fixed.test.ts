import { expect, test } from 'vitest'
import { occurrences } from './fixed'

test('a weekly cost comes every 7 days from its start', () => {
  const rent = { repeat: 'weekly' as const, start: '2026-10-01', end: null }
  expect(occurrences(rent, '2026-10-01', '2026-10-20')).toEqual(['2026-10-01', '2026-10-08', '2026-10-15'])
  expect(occurrences(rent, '2026-10-02', '2026-10-15')).toEqual(['2026-10-08', '2026-10-15'])
})

test('a cost every 2 weeks', () => {
  const cost = { repeat: 'fortnightly' as const, start: '2026-10-01', end: null }
  expect(occurrences(cost, '2026-10-12', '2026-11-15')).toEqual(['2026-10-15', '2026-10-29', '2026-11-12'])
})

test('a monthly cost on the 31st moves to the last day of a short month', () => {
  const cost = { repeat: 'monthly' as const, start: '2026-01-31', end: null }
  expect(occurrences(cost, '2026-01-01', '2026-04-30')).toEqual([
    '2026-01-31',
    '2026-02-28',
    '2026-03-31',
    '2026-04-30',
  ])
})

test('a cost stops after its end date and does not start before its start date', () => {
  const cost = { repeat: 'monthly' as const, start: '2026-10-05', end: '2026-12-05' }
  expect(occurrences(cost, '2026-01-01', '2027-06-30')).toEqual(['2026-10-05', '2026-11-05', '2026-12-05'])
  expect(occurrences(cost, '2026-01-01', '2026-10-04')).toEqual([])
})
