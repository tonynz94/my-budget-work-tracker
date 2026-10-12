import { useState } from 'react'
import { formatDate } from '../lib/dates'
import { formatMoney } from '../lib/format'
import { useBudget } from '../lib/useBudget'
import type { BudgetView } from '../lib/useBudget'
import { AnimatedMoney } from './AnimatedMoney'
import { BottomSheet } from './BottomSheet'
import { Line, PayPeriodSheet } from './PayPeriodSheet'
import { Pressable } from './Pressable'

const dayMonth = (date: string) => formatDate(date, { day: 'numeric', month: 'short' })

// What happened in the period before this one. It only tells me. It does not change this budget.
function lastResult(last: BudgetView): { text: string; over: boolean } | null {
  const { summary } = last
  if (summary.payCents === 0 && summary.spentTotal === 0) return null
  if (summary.leftInPeriod < 0) {
    const amount = formatMoney(-summary.leftInPeriod)
    return { text: `You spent ${amount} more than your last pay. Try to save ${amount}.`, over: true }
  }
  return { text: `You saved ${formatMoney(summary.leftInPeriod)} last period.`, over: false }
}

// How much I can spend today. This is the most important number in the app.
export function BudgetCard() {
  const { current, last } = useBudget()
  const [open, setOpen] = useState<'none' | 'summary' | 'pay'>('none')
  const { summary, period } = current
  const result = lastResult(last)

  return (
    <>
      <Pressable className="card card-button" onClick={() => setOpen('summary')}>
        <span className="card-label">Left today</span>
        <AnimatedMoney cents={summary.leftToday} className={summary.leftToday < 0 ? 'big-number text-red' : 'big-number'} />
        <span className="muted">
          Budget today {formatMoney(summary.todayBudget)} · Spent today {formatMoney(summary.spentToday)}
        </span>
        <span className="card-divider" />
        <span className={summary.leftInPeriod < 0 ? 'card-value text-red' : 'card-value'}>
          {formatMoney(summary.leftInPeriod)} left this period
        </span>
        <span className="muted">
          {dayMonth(period.start)} to {dayMonth(period.end)} · {summary.daysLeft} {summary.daysLeft === 1 ? 'day' : 'days'} left
          {current.hasPay && current.estimated && ' · estimated'}
        </span>
        {!current.hasPay && <span className="muted">Enter the actual pay or set the hourly rate to start.</span>}
        {result && <span className={result.over ? 'result result-red' : 'result result-blue'}>{result.text}</span>}
      </Pressable>

      <BottomSheet open={open === 'summary'} title="Budget period" onClose={() => setOpen('none')}>
        <div className="form">
          <PeriodLines view={current} title={`${dayMonth(period.start)} to ${dayMonth(period.end)}`} />
          <p className="muted">
            This period uses the pay for {dayMonth(period.pay.start)} to {dayMonth(period.pay.end)}. The payday was{' '}
            {formatDate(period.pay.payday, { weekday: 'short', day: 'numeric', month: 'short' })}.
          </p>
          <Pressable className="button button-plain" onClick={() => setOpen('pay')}>
            {current.estimated ? 'Enter the actual pay' : 'Change the actual pay'}
          </Pressable>

          {result && (
            <>
              <p className="section-title">Last period</p>
              <PeriodLines view={last} title={`${dayMonth(last.period.start)} to ${dayMonth(last.period.end)}`} />
              <p className={result.over ? 'result result-red' : 'result result-blue'}>{result.text}</p>
            </>
          )}
        </div>
      </BottomSheet>

      <PayPeriodSheet open={open === 'pay'} onClose={() => setOpen('none')} startAt={period.pay.start} />
    </>
  )
}

function PeriodLines({ view, title }: { view: BudgetView; title: string }) {
  const { summary } = view
  return (
    <div className="lines">
      <Line label={title} value="" />
      <Line label={view.estimated ? 'Pay, estimated' : 'Pay received'} value={formatMoney(summary.payCents)} />
      {summary.manualIncome > 0 && <Line label="Other income" value={`+ ${formatMoney(summary.manualIncome)}`} />}
      <Line label="Fixed costs" value={`- ${formatMoney(summary.fixedCents)}`} />
      <Line label="Money to spend" value={formatMoney(summary.available)} strong />
      <Line label="Spent" value={`- ${formatMoney(summary.spentTotal)}`} />
      <Line
        label="Left"
        value={formatMoney(summary.leftInPeriod)}
        strong
        color={summary.leftInPeriod < 0 ? 'text-red' : undefined}
      />
    </div>
  )
}
