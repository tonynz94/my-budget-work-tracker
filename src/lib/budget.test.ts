import { expect, test } from 'vitest'
import { budgetPeriodFor, budgetSummary, previousBudgetPeriod } from './budget'
import type { FixedCost } from './fixed'
import { buildLedger } from './ledger'
import type { Tx } from './ledger'
import type { PayCycle } from './pay'

function tx(date: string, cents: number, kind: Tx['kind'] = 'expense', fixedId: string | null = null): Tx {
  return { id: `${date}-${cents}-${kind}`, date, kind, cents, category: 'Food', note: '', fixedId }
}

function rent(overrides: Partial<FixedCost> = {}): FixedCost {
  return {
    id: 'rent',
    name: 'Rent',
    cents: 250_00,
    category: 'Rent',
    repeat: 'weekly',
    start: '2026-10-12',
    end: null,
    doneThrough: null,
    ...overrides,
  }
}

test('the pay from 8 October is spent from Monday 12 October to Sunday 25 October', () => {
  const period = budgetPeriodFor('2026-10-17', [])
  expect(period.start).toBe('2026-10-12')
  expect(period.end).toBe('2026-10-25')
  expect(period.pay.start).toBe('2026-09-21')
  expect(period.pay.payday).toBe('2026-10-08')
})

test('the next pay is spent from 26 October to 8 November', () => {
  expect(budgetPeriodFor('2026-10-25', []).start).toBe('2026-10-12')
  const next = budgetPeriodFor('2026-10-26', [])
  expect(next.start).toBe('2026-10-26')
  expect(next.end).toBe('2026-11-08')
  expect(next.pay.payday).toBe('2026-10-22')
  expect(previousBudgetPeriod(next, []).start).toBe('2026-10-12')
})

test('a weekly pay gives a budget period of 1 week', () => {
  const cycles: PayCycle[] = [{ from: '2026-10-05', weeks: 1, paydayOffset: 4 }]
  // 5 to 11 October is paid on Thursday 15 October.
  const period = budgetPeriodFor('2026-10-20', cycles)
  expect(period.start).toBe('2026-10-19')
  expect(period.end).toBe('2026-10-25')
  expect(period.pay.start).toBe('2026-10-05')
})

test('the budget periods follow a change of the pay cycle without a gap', () => {
  const cycles: PayCycle[] = [
    { from: '2026-09-21', weeks: 2, paydayOffset: 4 },
    { from: '2026-10-05', weeks: 1, paydayOffset: 4 },
  ]
  const first = budgetPeriodFor('2026-10-13', cycles)
  expect([first.start, first.end]).toEqual(['2026-10-12', '2026-10-18'])
  const second = budgetPeriodFor('2026-10-19', cycles)
  expect([second.start, second.end]).toEqual(['2026-10-19', '2026-10-25'])
})

const period = budgetPeriodFor('2026-10-12', [])

test('first day. Pay 800 and fixed costs 500 give 21.43 a day', () => {
  const fixed = [rent({ cents: 250_00, repeat: 'weekly' })]
  const summary = budgetSummary(period, 800_00, buildLedger([], {}, []), fixed, '2026-10-12')
  expect(summary.fixedCents).toBe(500_00)
  expect(summary.available).toBe(300_00)
  expect(summary.daysLeft).toBe(14)
  expect(summary.todayBudget).toBe(21_43)
})

test('day 6. I spent 120 until yesterday, so it is 20.00 a day', () => {
  const fixed = [rent({ cents: 250_00, repeat: 'weekly' })]
  const ledger = buildLedger([tx('2026-10-13', 70_00), tx('2026-10-16', 50_00)], {}, [])
  const summary = budgetSummary(period, 800_00, ledger, fixed, '2026-10-17')
  expect(summary.spentBefore).toBe(120_00)
  expect(summary.daysLeft).toBe(9)
  expect(summary.todayBudget).toBe(20_00)
})

test('money I spend today does not change the budget of today', () => {
  const ledger = buildLedger([tx('2026-10-12', 8_00)], {}, [])
  const summary = budgetSummary(period, 280_00, ledger, [], '2026-10-12')
  expect(summary.todayBudget).toBe(20_00)
  expect(summary.spentToday).toBe(8_00)
  expect(summary.leftToday).toBe(12_00)
  expect(summary.leftInPeriod).toBe(272_00)
})

test('manual income today makes the budget of today bigger right away', () => {
  const ledger = buildLedger([tx('2026-10-12', 140_00, 'income')], {}, [])
  const summary = budgetSummary(period, 280_00, ledger, [], '2026-10-12')
  expect(summary.manualIncome).toBe(140_00)
  expect(summary.todayBudget).toBe(30_00)
})

test('my pay in the budget book is not added a second time', () => {
  // The actual pay shows as income on 22 October, inside this budget period.
  const ledger = buildLedger([], { '2026-10-05': 900_00 }, [])
  const summary = budgetSummary(period, 280_00, ledger, [], '2026-10-12')
  expect(summary.manualIncome).toBe(0)
  expect(summary.available).toBe(280_00)
})

test('a fixed cost is taken off one time and is not daily spending', () => {
  // The rent of 12 October is already in the budget book. The rent of 19 October comes later.
  const fixed = [rent({ doneThrough: '2026-10-12' })]
  const ledger = buildLedger([tx('2026-10-12', 250_00, 'expense', 'rent')], {}, [])
  const summary = budgetSummary(period, 800_00, ledger, fixed, '2026-10-13')
  expect(summary.fixedCents).toBe(500_00)
  expect(summary.spentBefore).toBe(0)
  expect(summary.available).toBe(300_00)
})

test('a monthly fixed cost only counts in the period that has its date', () => {
  const phone = rent({ id: 'phone', cents: 40_00, repeat: 'monthly', start: '2026-10-28' })
  expect(budgetSummary(period, 800_00, buildLedger([], {}, []), [phone], '2026-10-12').fixedCents).toBe(0)
  const next = budgetPeriodFor('2026-10-26', [])
  expect(budgetSummary(next, 800_00, buildLedger([], {}, []), [phone], '2026-10-26').fixedCents).toBe(40_00)
})

test('a finished period shows how much I saved or went over', () => {
  const ledger = buildLedger([tx('2026-10-14', 200_00), tx('2026-10-20', 130_00)], {}, [])
  const over = budgetSummary(period, 300_00, ledger, [], '2026-10-27')
  expect(over.daysLeft).toBe(0)
  expect(over.leftInPeriod).toBe(-30_00)
  const saved = budgetSummary(period, 380_00, ledger, [], '2026-10-27')
  expect(saved.leftInPeriod).toBe(50_00)
})
