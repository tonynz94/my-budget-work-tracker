import { expect, test } from 'vitest'
import { buildLedger, incomeOn, spentOn, sumLedger } from './ledger'
import type { Tx } from './ledger'

function tx(id: string, date: string, kind: Tx['kind'], cents: number, category = 'Food'): Tx {
  return { id, date, kind, cents, category, note: '', fixedId: null }
}

const txs = [
  tx('a', '2026-10-12', 'expense', 8_00),
  tx('b', '2026-10-12', 'expense', 12_50, 'Transport'),
  tx('c', '2026-10-13', 'expense', 30_00),
  tx('d', '2026-10-13', 'income', 50_00, 'Income'),
  tx('e', '2026-11-01', 'expense', 99_00),
]

test('the day total has only the money I spent', () => {
  const ledger = buildLedger(txs, {}, [])
  expect(spentOn(ledger, '2026-10-12')).toBe(20_50)
  expect(spentOn(ledger, '2026-10-13')).toBe(30_00)
  expect(spentOn(ledger, '2026-10-14')).toBe(0)
  expect(incomeOn(ledger, '2026-10-13')).toBe(50_00)
  expect(incomeOn(ledger, '2026-10-12')).toBe(0)
})

test('the totals for a month, with the biggest category first', () => {
  const sum = sumLedger(buildLedger(txs, {}, []), '2026-10-01', '2026-10-31')
  expect(sum.spent).toBe(50_50)
  expect(sum.income).toBe(50_00)
  expect(sum.byCategory).toEqual([
    { category: 'Food', cents: 38_00 },
    { category: 'Transport', cents: 12_50 },
  ])
})

test('my actual pay shows up as income on the payday', () => {
  // The period from 21 September is paid on Thursday 8 October.
  const ledger = buildLedger([], { '2026-09-21': 790_00 }, [])
  const items = ledger.get('2026-10-08') ?? []
  expect(items).toHaveLength(1)
  expect(items[0].kind).toBe('income')
  expect(items[0].cents).toBe(790_00)
  expect(items[0].locked).toBe(true)
  expect(sumLedger(ledger, '2026-10-01', '2026-10-31').income).toBe(790_00)
})
