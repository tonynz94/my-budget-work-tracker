import { formatDate } from './dates'
import { periodFor } from './pay'
import type { PayCycle } from './pay'

export type TxKind = 'expense' | 'income'

// One line in the budget book.
export type Tx = {
  id: string
  date: string
  kind: TxKind
  cents: number
  category: string
  note: string
  // Set when the app made this record from a fixed cost.
  fixedId: string | null
}

// 'locked' is for my pay. I change it in the pay period and not in the budget book.
export type LedgerItem = Tx & { locked: boolean }

export const PAY_CATEGORY = 'Pay'
export const INCOME_CATEGORY = 'Income'

// The actual pay I entered shows up as income on the payday. It is not saved a second time.
export function payIncomes(actualPays: Record<string, number>, cycles: PayCycle[]): LedgerItem[] {
  const dayMonth = (date: string) => formatDate(date, { day: 'numeric', month: 'short' })
  return Object.entries(actualPays).map(([start, cents]) => {
    const period = periodFor(start, cycles)
    return {
      id: `pay-${start}`,
      date: period.payday,
      kind: 'income' as const,
      cents,
      category: PAY_CATEGORY,
      note: `${dayMonth(period.start)} to ${dayMonth(period.end)}`,
      fixedId: null,
      locked: true,
    }
  })
}

export type Ledger = ReadonlyMap<string, LedgerItem[]>

// All the records by date.
export function buildLedger(txs: Iterable<Tx>, actualPays: Record<string, number>, cycles: PayCycle[]): Ledger {
  const ledger = new Map<string, LedgerItem[]>()
  const add = (item: LedgerItem) => {
    const list = ledger.get(item.date)
    if (list) list.push(item)
    else ledger.set(item.date, [item])
  }
  for (const tx of txs) add({ ...tx, locked: false })
  for (const item of payIncomes(actualPays, cycles)) add(item)
  return ledger
}

export type LedgerSum = {
  spent: number
  income: number
  // Spending by category, from the biggest to the smallest.
  byCategory: { category: string; cents: number }[]
}

// The totals from one date to another date. Both ends are included.
export function sumLedger(ledger: Ledger, from: string, to: string): LedgerSum {
  let spent = 0
  let income = 0
  const categories = new Map<string, number>()
  for (const [date, items] of ledger) {
    if (date < from || date > to) continue
    for (const item of items) {
      if (item.kind === 'income') {
        income += item.cents
      } else {
        spent += item.cents
        categories.set(item.category, (categories.get(item.category) ?? 0) + item.cents)
      }
    }
  }
  const byCategory = [...categories].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents)
  return { spent, income, byCategory }
}

// The money that came in on a day. My pay is in it too.
export function incomeOn(ledger: Ledger, date: string): number {
  let total = 0
  for (const item of ledger.get(date) ?? []) {
    if (item.kind === 'income') total += item.cents
  }
  return total
}

export function spentOn(ledger: Ledger, date: string): number {
  let total = 0
  for (const item of ledger.get(date) ?? []) {
    if (item.kind === 'expense') total += item.cents
  }
  return total
}
