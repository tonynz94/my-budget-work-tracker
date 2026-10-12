import { useEffect, useState } from 'react'
import { useConfig } from '../lib/config'
import { daysBetween, formatDate } from '../lib/dates'
import { formatMoney } from '../lib/format'
import { nzDate } from '../lib/nzTime'
import { nextPaidPeriod, periodFor } from '../lib/pay'
import { usePayFor } from '../lib/usePay'
import { useWork } from '../lib/workStore'
import { PayPeriodSheet } from './PayPeriodSheet'
import { Pressable } from './Pressable'

// The money I earned in this pay period, and the next payday.
export function PayCard() {
  const today = nzDate()
  const { config } = useConfig()
  const { ensureLoaded } = useWork()
  const payFor = usePayFor()
  const [open, setOpen] = useState(false)

  const current = periodFor(today, config.payCycles)
  const pay = payFor(current)

  // The next payday can pay a period that already ended, so I show its amount too.
  const coming = nextPaidPeriod(today, config.payCycles)
  const comingActual = config.actualPays[coming.start] ?? null
  const comingCents = comingActual ?? payFor(coming).netCents
  const daysLeft = daysBetween(today, coming.payday)
  const when = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`

  useEffect(() => {
    ensureLoaded(coming.start)
  }, [coming.start, ensureLoaded])

  return (
    <>
      <Pressable className="card card-button" onClick={() => setOpen(true)}>
        <span className="card-label">Pay this period</span>
        {pay.mode === 'none' ? (
          <>
            <span className="big-number">$ –</span>
            <span className="muted">Set the hourly rate in Settings.</span>
          </>
        ) : (
          <>
            <span className="big-number">{formatMoney(pay.netCents)}</span>
            <span className="muted">
              After tax, estimated
              {pay.grossCents !== null && ` · ${formatMoney(pay.grossCents)} before tax`}
            </span>
          </>
        )}
        <span className="card-divider" />
        <span className="card-value">
          {formatDate(coming.payday, { month: 'short', day: 'numeric' })}
          {pay.mode !== 'none' && `, ${formatMoney(comingCents)}`}
        </span>
        <span className="muted">
          Next payday {when}
          {pay.mode !== 'none' && comingActual === null && ' · estimated'}
        </span>
      </Pressable>

      <PayPeriodSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
