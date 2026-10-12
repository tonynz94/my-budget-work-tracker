import { useEffect, useState } from 'react'
import { useConfig } from '../lib/config'
import { addDays, formatDate } from '../lib/dates'
import { formatDuration, formatMoney, parseMoney } from '../lib/format'
import { nzDate } from '../lib/nzTime'
import { actualHourlyCents, periodFor } from '../lib/pay'
import type { PayPeriod, PeriodPay } from '../lib/pay'
import { usePayFor } from '../lib/usePay'
import { kindLabels } from '../lib/work'
import { useWork } from '../lib/workStore'
import { BottomSheet } from './BottomSheet'
import { Field } from './Form'
import { Pressable } from './Pressable'

const dayMonth = (date: string) => formatDate(date, { day: 'numeric', month: 'short' })
const weekdayDate = (date: string) => formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })

export function Line({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div className={strong ? 'line line-strong' : 'line'}>
      <span>{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}

type SheetProps = {
  open: boolean
  onClose: () => void
  // A date inside the period to show first. Without it the sheet shows the period of today.
  startAt?: string
}

export function PayPeriodSheet({ open, onClose, startAt }: SheetProps) {
  return (
    <BottomSheet open={open} title="Pay period" onClose={onClose}>
      <PayPeriodView startAt={startAt} />
    </BottomSheet>
  )
}

// One pay period on one screen. I use it to compare with my payslip.
function PayPeriodView({ startAt }: { startAt?: string }) {
  const today = nzDate()
  const { config } = useConfig()
  const { ensureLoaded } = useWork()
  const payFor = usePayFor()
  const current = periodFor(today, config.payCycles)
  // Any date inside the period on screen.
  const [anchor, setAnchor] = useState(startAt ?? today)
  const period = periodFor(anchor, config.payCycles)
  const pay = payFor(period)
  const actual = config.actualPays[period.start] ?? null

  useEffect(() => {
    ensureLoaded(period.start)
  }, [period.start, ensureLoaded])

  return (
    <div className="form">
      <div className="calendar-head">
        <Pressable className="icon-button" label="Previous period" onClick={() => setAnchor(addDays(period.start, -1))}>
          ‹
        </Pressable>
        <p className="calendar-title">
          {dayMonth(period.start)} to {dayMonth(period.end)}
        </p>
        <Pressable
          className="icon-button"
          label="Next period"
          disabled={period.start >= current.start}
          onClick={() => setAnchor(addDays(period.end, 1))}
        >
          ›
        </Pressable>
      </div>
      <p className="muted center">Payday {weekdayDate(period.payday)}</p>

      {pay.mode === 'none' && <p className="notice">Set the hourly rate in Settings to see the money.</p>}

      <div className="lines">
        <Line label="Paid time" value={formatDuration(pay.paidMin)} />
        {pay.grossCents !== null && (
          <>
            <Line label="Before tax, estimated" value={formatMoney(pay.grossCents)} />
            <Line label="PAYE tax" value={`- ${formatMoney(pay.payeCents)}`} />
            <Line label="ACC levy" value={`- ${formatMoney(pay.accCents)}`} />
          </>
        )}
        <Line label="After tax, estimated" value={formatMoney(pay.netCents)} strong={actual === null} />
        {actual !== null && (
          <>
            <Line label="Actual pay" value={formatMoney(actual)} strong />
            <Line
              label="Actual minus estimated"
              value={`${actual >= pay.netCents ? '+' : '-'} ${formatMoney(Math.abs(actual - pay.netCents))}`}
              color={actual >= pay.netCents ? 'text-blue' : 'text-red'}
            />
          </>
        )}
      </div>

      <ActualPayForm key={period.start} period={period} pay={pay} actual={actual} />

      <p className="section-title">Days</p>
      {pay.days.length === 0 && <p className="muted">No work in this period.</p>}
      {pay.days.map((day) => (
        <div key={day.entry.date} className="item">
          <div>
            <p className="item-title">{weekdayDate(day.entry.date)}</p>
            {day.entry.kind !== 'regular' && <p className="muted">{kindLabels[day.entry.kind]}</p>}
          </div>
          <div className="item-right">
            <p className="item-title">{formatDuration(day.minutes)}</p>
            {pay.mode !== 'none' && <p className="muted">{formatMoney(Math.round(day.cents))}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

type ActualProps = { period: PayPeriod; pay: PeriodPay; actual: number | null }

function ActualPayForm({ period, pay, actual }: ActualProps) {
  const { config, update } = useConfig()
  const [text, setText] = useState(actual !== null ? (actual / 100).toFixed(2) : '')
  const [message, setMessage] = useState<string | null>(null)

  const save = () => {
    const cents = parseMoney(text)
    if (cents === null) {
      setMessage('Enter the amount as a number.')
      return
    }
    setMessage(null)
    update({ actualPays: { ...config.actualPays, [period.start]: cents } })
  }

  const clear = () => {
    const rest = { ...config.actualPays }
    delete rest[period.start]
    setText('')
    setMessage(null)
    update({ actualPays: rest })
  }

  // With an after-tax rate I can see what I really got for one hour.
  const hourly = pay.mode === 'net' && actual !== null ? actualHourlyCents(actual, pay.weightedMin) : null
  const nextStart = addDays(periodFor(nzDate(), config.payCycles).end, 1)

  const useHourly = () => {
    if (hourly === null) return
    update({
      rates: [...config.rates.filter((rate) => rate.from !== nextStart), { from: nextStart, cents: hourly, mode: 'net' }],
    })
    setMessage(`The rate is ${formatMoney(hourly)} from ${dayMonth(nextStart)}. Older records keep the old rate.`)
  }

  return (
    <>
      <div className="field-row">
        <Field label="Actual pay after tax ($)">
          <input className="input" inputMode="decimal" placeholder="0.00" value={text} onChange={(event) => setText(event.target.value)} />
        </Field>
        <Pressable className="button button-primary button-inline" onClick={save}>
          Save
        </Pressable>
      </div>
      {actual !== null && (
        <button type="button" className="text-button" onClick={clear}>
          Remove the actual pay
        </button>
      )}
      {hourly !== null && (
        <>
          <p className="muted">My real hourly rate after tax was {formatMoney(hourly)}.</p>
          <Pressable className="button button-plain" onClick={useHourly}>
            Use {formatMoney(hourly)} from the next pay period
          </Pressable>
        </>
      )}
      {message && <p className="form-note">{message}</p>}
    </>
  )
}
