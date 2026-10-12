import { useCallback } from 'react'
import { useConfig } from './config'
import { periodPay } from './pay'
import type { PayPeriod, PeriodPay } from './pay'
import { useWork } from './workStore'

// The pay of a period, from my work records and my settings.
export function usePayFor(): (period: PayPeriod) => PeriodPay {
  const { config } = useConfig()
  const { entries } = useWork()
  return useCallback(
    (period: PayPeriod) =>
      periodPay(period, entries, config.rates, config.holidayMultiplier, {
        brackets: config.taxBrackets,
        accRate: config.accRate,
      }),
    [entries, config.rates, config.holidayMultiplier, config.taxBrackets, config.accRate],
  )
}
