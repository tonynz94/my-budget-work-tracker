import { useEffect, useMemo, useState } from 'react'
import { Fab } from '../components/Fab'
import { PayCard } from '../components/PayCard'
import { Pressable } from '../components/Pressable'
import { WeekCard } from '../components/WeekCard'
import { WorkEntrySheet } from '../components/WorkEntrySheet'
import { useConfig } from '../lib/config'
import { addMonths, formatDate, monthGrid, monthStart, yearOf } from '../lib/dates'
import { formatClock, formatDuration, formatShortDuration } from '../lib/format'
import { nzDate } from '../lib/nzTime'
import { useHolidayMap } from '../lib/useHolidays'
import { kindLabels, paidMinutes, weekSummary } from '../lib/work'
import type { WorkEntry } from '../lib/work'
import { useWork } from '../lib/workStore'

const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function describe(entry: WorkEntry): string {
  const parts: string[] = []
  if (entry.startMin !== null && entry.endMin !== null) {
    parts.push(`${formatClock(entry.startMin)} to ${formatClock(entry.endMin)}`)
  }
  if (entry.breakMin > 0) parts.push(`${entry.breakMin}m break`)
  parts.push(`Paid ${formatDuration(paidMinutes(entry))}`)
  return parts.join(' · ')
}

export function Work() {
  const today = nzDate()
  const { config } = useConfig()
  const { entries, ensureLoaded, error } = useWork()
  const [month, setMonth] = useState(monthStart(today))
  const [selected, setSelected] = useState(today)
  const [editing, setEditing] = useState<string | null>(null)

  const weeks = useMemo(() => monthGrid(month), [month])
  const gridStart = weeks[0][0]
  const gridEnd = weeks[weeks.length - 1][6]
  const holidays = useHolidayMap([...new Set([yearOf(gridStart), yearOf(gridEnd), yearOf(selected)])])

  useEffect(() => {
    ensureLoaded(gridStart)
  }, [gridStart, ensureLoaded])

  // I can only record work that already happened.
  const pick = (date: string) => {
    setSelected(date)
    if (date <= today) setEditing(date)
  }

  const selectedEntry = entries.get(selected)
  const selectedHoliday = holidays.get(selected)

  return (
    <>
      <h1 className="page-title">Work</h1>

      <div className="card-grid">
        <WeekCard />
        <PayCard />

        <section className="card card-wide">
          <div className="calendar-head">
            <Pressable className="icon-button" label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
              ‹
            </Pressable>
            <p className="calendar-title">{formatDate(month, { month: 'long', year: 'numeric' })}</p>
            <Pressable className="icon-button" label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
              ›
            </Pressable>
          </div>

          <div className="calendar">
            {dayNames.map((name, i) => (
              <span key={i} className="calendar-day-name">
                {name}
              </span>
            ))}
            <span className="calendar-day-name">Week</span>

            {weeks.map((week) => {
              const summary = weekSummary(week[0], entries, config.vacations, config.limits)
              return (
                <div key={week[0]} className="calendar-week">
                  {week.map((date) => {
                    const entry = entries.get(date)
                    const classes = ['day']
                    if (date.slice(0, 7) !== month.slice(0, 7)) classes.push('day-other')
                    if (date === today) classes.push('day-today')
                    if (date === selected) classes.push('day-selected')
                    if (holidays.has(date)) classes.push('day-holiday')
                    if (date > today) classes.push('day-future')
                    return (
                      <button key={date} type="button" className={classes.join(' ')} onClick={() => pick(date)}>
                        <span className="day-number">{Number(date.slice(8))}</span>
                        <span className="day-hours">{entry ? formatShortDuration(paidMinutes(entry)) : ''}</span>
                      </button>
                    )
                  })}
                  <span className={`week-total status-text-${summary.status}`}>
                    {summary.worked > 0 ? formatShortDuration(summary.worked) : ''}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="day-detail">
            <p className="card-value">
              {formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {selectedHoliday && <p className="text-red">{selectedHoliday.name}</p>}
            {selectedEntry ? (
              <>
                <p className="muted">{kindLabels[selectedEntry.kind]}</p>
                <p className="muted">{describe(selectedEntry)}</p>
                {selectedEntry.note && <p className="muted">{selectedEntry.note}</p>}
              </>
            ) : (
              <p className="muted">{selected > today ? 'I can add hours when the day comes.' : 'No hours yet.'}</p>
            )}
          </div>
          {error && <p className="text-red">Could not load the records. {error}</p>}
        </section>
      </div>

      <Fab label="Add work hours for today" onClick={() => pick(today)} />

      <WorkEntrySheet date={editing} onClose={() => setEditing(null)} />
    </>
  )
}
