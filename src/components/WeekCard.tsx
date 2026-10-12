import { useConfig } from '../lib/config'
import { weekStart } from '../lib/dates'
import { formatDuration } from '../lib/format'
import { nzDate } from '../lib/nzTime'
import { isVacationDay, weekSummary } from '../lib/work'
import { useWork } from '../lib/workStore'

// This week's work hours and the hours left under the visa limit.
export function WeekCard() {
  const { config } = useConfig()
  const { entries } = useWork()
  const today = nzDate()
  const summary = weekSummary(weekStart(today), entries, config.vacations, config.limits)
  const noLimit = isVacationDay(today, config.vacations)

  const color = noLimit ? '' : summary.status === 'over' ? 'text-red' : summary.status === 'warn' ? 'text-yellow' : ''
  const percent = Math.min(100, (summary.counted / summary.limit) * 100)

  return (
    <section className="card">
      <p className="card-label">Work this week</p>
      <p className={`big-number ${color}`}>{formatDuration(summary.worked)}</p>
      {noLimit ? (
        <p className="card-value">🏝️ No limit</p>
      ) : (
        <>
          <div className="progress" aria-hidden="true">
            <div className={`progress-bar status-${summary.status}`} style={{ width: `${percent}%` }} />
          </div>
          <p className={`muted ${color}`}>
            {summary.left >= 0
              ? `${formatDuration(summary.left)} left of ${formatDuration(summary.limit)}`
              : `${formatDuration(-summary.left)} over the ${formatDuration(summary.limit)} limit`}
          </p>
        </>
      )}
    </section>
  )
}
