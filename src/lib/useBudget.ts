import { useEffect } from 'react'
import { budgetPeriodFor, budgetSummary, previousBudgetPeriod } from './budget'
import type { BudgetPeriod, BudgetSummary } from './budget'
import { useConfig } from './config'
import { budgetDate } from './nzTime'
import { useTx } from './txStore'
import { usePayFor } from './usePay'
import { useWork } from './workStore'

export type BudgetView = {
  period: BudgetPeriod
  summary: BudgetSummary
  // True when I did not enter the actual pay yet, so the app uses the estimate.
  estimated: boolean
  // False when there is no actual pay and no hourly rate, so there is no number to use.
  hasPay: boolean
}

// The budget of this period and of the period before it.
export function useBudget(): { today: string; current: BudgetView; last: BudgetView } {
  const { config } = useConfig()
  const { ledger, ensureLoaded: loadTx } = useTx()
  const { ensureLoaded: loadWork } = useWork()
  const payFor = usePayFor()

  // The budget day starts at 3 a.m.
  const today = budgetDate()
  const period = budgetPeriodFor(today, config.payCycles)
  const before = previousBudgetPeriod(period, config.payCycles)

  // The estimate needs the work records of the pay periods, and those are a few weeks back.
  useEffect(() => {
    loadWork(before.pay.start)
    loadTx(before.start)
  }, [before.pay.start, before.start, loadWork, loadTx])

  const view = (target: BudgetPeriod): BudgetView => {
    const actual = config.actualPays[target.pay.start]
    const estimate = payFor(target.pay)
    return {
      period: target,
      summary: budgetSummary(target, actual ?? estimate.netCents, ledger, config.fixedCosts, today),
      estimated: actual === undefined,
      hasPay: actual !== undefined || estimate.mode !== 'none',
    }
  }

  return { today, current: view(period), last: view(before) }
}
