import { useState } from 'react'
import type { BudgetLine } from '../lib/budget'
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
        <span className="today-stats">
          <span className="today-stat">
            <span className="muted">Budget today</span>
            <span className="card-value text-green">{formatMoney(summary.todayBudget)}</span>
          </span>
          <span className="today-stat">
            <span className="muted">Spent today</span>
            <span className="card-value text-blue">{formatMoney(summary.spentToday)}</span>
          </span>
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

type Detail = 'income' | 'fixed' | 'spent'

function PeriodLines({ view, title }: { view: BudgetView; title: string }) {
  const { summary } = view
  // The line I tapped. Its records show under it, so I can see where the number comes from.
  const [open, setOpen] = useState<Detail | null>(null)
  const toggle = (detail: Detail) => setOpen(open === detail ? null : detail)

  return (
    <div className="lines">
      <Line label={title} value="" />
      <Line label={view.estimated ? 'Pay, estimated' : 'Pay received'} value={formatMoney(summary.payCents)} />
      {summary.manualIncome > 0 && (
        <DetailLine
          label="Other income"
          value={`+ ${formatMoney(summary.manualIncome)}`}
          lines={summary.incomeLines}
          open={open === 'income'}
          onToggle={() => toggle('income')}
        />
      )}
      <DetailLine
        label="Fixed costs"
        value={`- ${formatMoney(summary.fixedCents)}`}
        lines={summary.fixedLines}
        open={open === 'fixed'}
        onToggle={() => toggle('fixed')}
      />
      <Line label="Money to spend" value={formatMoney(summary.available)} strong />
      <DetailLine
        label="Spent"
        value={`- ${formatMoney(summary.spentTotal)}`}
        lines={summary.spentLines}
        open={open === 'spent'}
        onToggle={() => toggle('spent')}
      />
      <Line
        label="Left"
        value={formatMoney(summary.leftInPeriod)}
        strong
        color={summary.leftInPeriod < 0 ? 'text-red' : undefined}
      />
    </div>
  )
}

type DetailLineProps = { label: string; value: string; lines: BudgetLine[]; open: boolean; onToggle: () => void }

// A line of the summary that opens a list of its records when I tap it.
function DetailLine({ label, value, lines, open, onToggle }: DetailLineProps) {
  return (
    <>
      <button type="button" className="line line-button" aria-expanded={open} onClick={onToggle}>
        <span>
          {label} <span className="line-arrow">{open ? '▾' : '▸'}</span>
        </span>
        <span>{value}</span>
      </button>
      {open && (
        <div className="line-details">
          {lines.length === 0 && <p className="muted">Nothing here.</p>}
          {lines.map((line, i) => (
            <div key={i} className={line.planned ? 'line line-detail line-planned' : 'line line-detail'}>
              <span>
                {formatDate(line.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {line.label}
                {line.planned && ' · planned'}
              </span>
              <span>{formatMoney(line.cents)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
