import { expect, test } from 'vitest'
import {
  DEFAULT_ACC_RATE,
  actualHourlyCents,
  annualTax,
  defaultBrackets,
  nextPaidPeriod,
  periodFor,
  periodPay,
  rateOn,
} from './pay'
import type { PayCycle, RateChange } from './pay'
import type { WorkEntry } from './work'

const tax = { brackets: defaultBrackets, accRate: DEFAULT_ACC_RATE }

function hours(date: string, h: number, kind: WorkEntry['kind'] = 'regular'): WorkEntry {
  return { date, kind, startMin: null, endMin: null, totalMin: h * 60, breakMin: 0, note: '' }
}

function mapOf(...entries: WorkEntry[]): Map<string, WorkEntry> {
  return new Map(entries.map((entry) => [entry.date, entry]))
}

test('a 2 week period is paid on the Thursday after it ends', () => {
  const period = periodFor('2026-09-25', [])
  expect(period.start).toBe('2026-09-21')
  expect(period.end).toBe('2026-10-04')
  expect(period.payday).toBe('2026-10-08')
  expect(period.perYear).toBe(26)
})

test('a 1 week period', () => {
  const cycles: PayCycle[] = [{ from: '2026-10-05', weeks: 1, paydayOffset: 4 }]
  const period = periodFor('2026-10-07', cycles)
  expect(period.start).toBe('2026-10-05')
  expect(period.end).toBe('2026-10-11')
  expect(period.payday).toBe('2026-10-15')
  expect(period.perYear).toBe(52)
})

test('a new cycle starts from its date and older periods do not change', () => {
  const cycles: PayCycle[] = [
    { from: '2026-09-21', weeks: 2, paydayOffset: 4 },
    { from: '2026-10-05', weeks: 1, paydayOffset: 4 },
  ]
  expect(periodFor('2026-10-01', cycles).start).toBe('2026-09-21')
  expect(periodFor('2026-10-01', cycles).end).toBe('2026-10-04')
  expect(periodFor('2026-10-13', cycles).start).toBe('2026-10-12')
  expect(periodFor('2026-10-13', cycles).end).toBe('2026-10-18')
})

test('the next payday can be for a period that already ended', () => {
  expect(nextPaidPeriod('2026-10-06', []).start).toBe('2026-09-21')
  expect(nextPaidPeriod('2026-10-08', []).payday).toBe('2026-10-08')
  expect(nextPaidPeriod('2026-10-09', []).payday).toBe('2026-10-22')
})

test('income tax for a year', () => {
  expect(annualTax(15_600_00, defaultBrackets)).toBeCloseTo(1_638_00)
  expect(annualTax(26_000_00, defaultBrackets)).toBeCloseTo(3_458_00)
  expect(annualTax(53_500_00, defaultBrackets)).toBeCloseTo(8_270_50)
  expect(annualTax(200_000_00, defaultBrackets)).toBeCloseTo(15_650_50 + 33_627_00 + 7_800_00)
})

test('a before-tax rate gives before tax, PAYE, ACC and after tax', () => {
  const rates: RateChange[] = [{ from: '2026-01-01', cents: 2500, mode: 'gross' }]
  const entries = mapOf(hours('2026-09-21', 20), hours('2026-09-28', 20))
  const pay = periodPay(periodFor('2026-09-21', []), entries, rates, 1.5, tax)
  // $1,000 in 2 weeks is $26,000 a year. The tax for the year is $3,458, so $133 for 2 weeks.
  expect(pay.mode).toBe('gross')
  expect(pay.paidMin).toBe(40 * 60)
  expect(pay.grossCents).toBe(1_000_00)
  expect(pay.payeCents).toBe(133_00)
  expect(pay.accCents).toBe(17_50)
  expect(pay.netCents).toBe(849_50)
})

test('an after-tax rate is used as it is and there is no before-tax number', () => {
  const rates: RateChange[] = [{ from: '2026-01-01', cents: 2000, mode: 'net' }]
  const entries = mapOf(hours('2026-09-21', 32), hours('2026-09-28', 8, 'holiday_worked'))
  const pay = periodPay(periodFor('2026-09-21', []), entries, rates, 1.5, tax)
  // 32 hours at $20 and 8 holiday hours at $30.
  expect(pay.mode).toBe('net')
  expect(pay.grossCents).toBeNull()
  expect(pay.netCents).toBe(880_00)
  expect(pay.weightedMin).toBe(44 * 60)
})

test('a paid holiday off is paid at the normal rate', () => {
  const rates: RateChange[] = [{ from: '2026-01-01', cents: 2000, mode: 'net' }]
  const pay = periodPay(periodFor('2026-09-21', []), mapOf(hours('2026-09-21', 5, 'holiday_not_worked')), rates, 1.5, tax)
  expect(pay.netCents).toBe(100_00)
})

test('work outside the period is not in the pay', () => {
  const rates: RateChange[] = [{ from: '2026-01-01', cents: 2000, mode: 'net' }]
  const entries = mapOf(hours('2026-09-20', 5), hours('2026-10-04', 5), hours('2026-10-05', 5))
  expect(periodPay(periodFor('2026-09-21', []), entries, rates, 1.5, tax).netCents).toBe(100_00)
})

test('a new rate does not change the money of older records', () => {
  const rates: RateChange[] = [
    { from: '2026-10-05', cents: 2500, mode: 'net' },
    { from: '2026-01-01', cents: 2000, mode: 'net' },
  ]
  expect(rateOn('2026-10-04', rates)?.cents).toBe(2000)
  expect(rateOn('2026-10-05', rates)?.cents).toBe(2500)
  expect(rateOn('2025-06-01', rates)?.cents).toBe(2000)
  const pay = periodPay(periodFor('2026-09-21', []), mapOf(hours('2026-09-21', 10)), rates, 1.5, tax)
  expect(pay.netCents).toBe(200_00)
})

test('the real after-tax hourly rate counts holiday hours 1.5 times', () => {
  // 40 hours with 8 holiday hours and $840 in the bank. 840 / 44 = 19.09
  expect(actualHourlyCents(840_00, (32 + 8 * 1.5) * 60)).toBe(19_09)
  expect(actualHourlyCents(840_00, 0)).toBeNull()
})

test('no hourly rate yet', () => {
  const pay = periodPay(periodFor('2026-09-21', []), mapOf(hours('2026-09-21', 10)), [], 1.5, tax)
  expect(pay.mode).toBe('none')
  expect(pay.netCents).toBe(0)
})
