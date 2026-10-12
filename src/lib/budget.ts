import { addDays, daysBetween, weekday } from './dates'
import { occurrences } from './fixed'
import type { FixedCost } from './fixed'
import type { Ledger } from './ledger'
import { periodFor } from './pay'
import type { PayCycle, PayPeriod } from './pay'

// The days when I spend one pay. It starts on the first Monday after the payday.
export type BudgetPeriod = {
  start: string
  end: string
  // The pay period that pays for these days.
  pay: PayPeriod
}

// The first Monday after the payday.
function budgetStart(pay: PayPeriod): string {
  return addDays(pay.payday, 7 - weekday(pay.payday))
}

function toBudgetPeriod(pay: PayPeriod, cycles: PayCycle[]): BudgetPeriod {
  // It ends the day before the next pay starts its own budget period.
  const nextPay = periodFor(addDays(pay.end, 1), cycles)
  return { start: budgetStart(pay), end: addDays(budgetStart(nextPay), -1), pay }
}

// The budget period that has this date in it.
export function budgetPeriodFor(date: string, cycles: PayCycle[]): BudgetPeriod {
  let pay = periodFor(date, cycles)
  for (let i = 0; i < 12 && budgetStart(pay) > date; i++) {
    pay = periodFor(addDays(pay.start, -1), cycles)
  }
  for (let i = 0; i < 12; i++) {
    const next = periodFor(addDays(pay.end, 1), cycles)
    if (budgetStart(next) > date) break
    pay = next
  }
  return toBudgetPeriod(pay, cycles)
}

export function previousBudgetPeriod(period: BudgetPeriod, cycles: PayCycle[]): BudgetPeriod {
  return budgetPeriodFor(addDays(period.start, -1), cycles)
}

export type BudgetSummary = {
  payCents: number
  manualIncome: number
  fixedCents: number
  // Pay plus manual income minus the fixed costs of this period.
  available: number
  spentBefore: number
  spentToday: number
  spentTotal: number
  // The days left in the period, with today. It is 0 when the period is over.
  daysLeft: number
  // This number is set from the money I spent until yesterday. Spending today does not change it.
  todayBudget: number
  leftToday: number
  leftInPeriod: number
}

export function budgetSummary(
  period: BudgetPeriod,
  payCents: number,
  ledger: Ledger,
  fixedCosts: FixedCost[],
  today: string,
): BudgetSummary {
  let manualIncome = 0
  let fixedCents = 0
  let spentBefore = 0
  let spentToday = 0

  for (let date = period.start; date <= period.end; date = addDays(date, 1)) {
    for (const item of ledger.get(date) ?? []) {
      if (item.kind === 'income') {
        // My pay is already counted as payCents, so it is not added a second time.
        if (!item.locked) manualIncome += item.cents
      } else if (item.fixedId) {
        // A fixed cost is taken off the whole period one time. It is not counted as daily spending.
        fixedCents += item.cents
      } else if (date < today) {
        spentBefore += item.cents
      } else if (date === today) {
        spentToday += item.cents
      }
    }
  }

  // The fixed costs that come later in this period are not in the budget book yet.
  for (const fixed of fixedCosts) {
    const notMadeFrom = fixed.doneThrough ? addDays(fixed.doneThrough, 1) : fixed.start
    const from = notMadeFrom > period.start ? notMadeFrom : period.start
    fixedCents += occurrences(fixed, from, period.end).length * fixed.cents
  }

  const available = payCents + manualIncome - fixedCents
  const daysLeft = today <= period.end ? daysBetween(today < period.start ? period.start : today, period.end) + 1 : 0
  const todayBudget = daysLeft > 0 ? Math.round((available - spentBefore) / daysLeft) : 0
  const spentTotal = spentBefore + spentToday

  return {
    payCents,
    manualIncome,
    fixedCents,
    available,
    spentBefore,
    spentToday,
    spentTotal,
    daysLeft,
    todayBudget,
    leftToday: todayBudget - spentToday,
    leftInPeriod: available - spentTotal,
  }
}
