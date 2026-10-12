import { expect, test } from 'vitest'
import { budgetCsv, toCsv, workCsv } from './csv'
import type { LedgerItem } from './ledger'
import type { WorkEntry } from './work'

test('a cell with a comma, a quote or a new line goes inside quotes', () => {
  expect(toCsv(['A', 'B'], [['plain', 'one, two'], ['say "hi"', 'line 1\nline 2']])).toBe(
    'A,B\r\nplain,"one, two"\r\n"say ""hi""","line 1\nline 2"\r\n',
  )
})

test('work records come out by date with the paid time', () => {
  const entries: WorkEntry[] = [
    { date: '2026-10-13', kind: 'holiday_not_worked', startMin: null, endMin: null, totalMin: 300, breakMin: 0, note: '' },
    { date: '2026-10-12', kind: 'regular', startMin: 540, endMin: 913, totalMin: null, breakMin: 60, note: 'Busy, long day' },
  ]
  expect(workCsv(entries)).toBe(
    'Date,Type,Start,End,Total entered,Unpaid break (min),Paid minutes,Paid hours,Note\r\n' +
      '2026-10-12,Regular,09:00,15:13,,60,313,5.22,"Busy, long day"\r\n' +
      '2026-10-13,Public holiday not worked,,,5:00,0,300,5.00,\r\n',
  )
})

test('budget records come out by date with the amount in dollars', () => {
  const items: LedgerItem[] = [
    { id: 'b', date: '2026-10-12', kind: 'expense', cents: 25000, category: 'Rent', note: 'Rent', fixedId: 'rent', locked: false },
    { id: 'a', date: '2026-10-08', kind: 'income', cents: 87459, category: 'Pay', note: '21 Sep to 4 Oct', fixedId: null, locked: true },
  ]
  expect(budgetCsv(items)).toBe(
    'Date,Type,Amount,Category,Note,Fixed cost\r\n' +
      '2026-10-08,Income,874.59,Pay,21 Sep to 4 Oct,\r\n' +
      '2026-10-12,Expense,250.00,Rent,Rent,yes\r\n',
  )
})
