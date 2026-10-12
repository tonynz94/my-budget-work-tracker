import { useEffect, useMemo, useState } from 'react'
import { BudgetCard } from '../components/BudgetCard'
import { Fab } from '../components/Fab'
import { Pressable } from '../components/Pressable'
import { TxSheet } from '../components/TxSheet'
import type { TxTarget } from '../components/TxSheet'
import { useConfig } from '../lib/config'
import { addDays, addMonths, formatDate, monthGrid, monthStart } from '../lib/dates'
import { plannedCosts } from '../lib/fixed'
import { formatMoney, formatCalendarMoney } from '../lib/format'
import { incomeOn, spentOn, sumLedger } from '../lib/ledger'
import { budgetDate } from '../lib/nzTime'
import { useTx } from '../lib/txStore'

const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function Budget() {
  const today = budgetDate()
  const { ledger, ensureLoaded, error } = useTx()
  const [month, setMonth] = useState(monthStart(today))
  const [selected, setSelected] = useState(today)
  const [target, setTarget] = useState<TxTarget | null>(null)

  const weeks = useMemo(() => monthGrid(month), [month])
  const gridStart = weeks[0][0]
  const monthEnd = addDays(addMonths(month, 1), -1)
  const sum = useMemo(() => sumLedger(ledger, month, monthEnd), [ledger, month, monthEnd])
  const biggest = sum.byCategory[0]?.cents ?? 0
  const items = ledger.get(selected) ?? []

  // The fixed costs that come after today. They are not in the budget book yet.
  const { config } = useConfig()
  const gridEnd = weeks[weeks.length - 1][6]
  const planned = useMemo(
    () => plannedCosts(config.fixedCosts, addDays(today, 1), gridEnd),
    [config.fixedCosts, today, gridEnd],
  )
  const plannedItems = planned.get(selected) ?? []

  useEffect(() => {
    ensureLoaded(gridStart)
  }, [gridStart, ensureLoaded])

  return (
    <>
      <h1 className="page-title">Budget</h1>

      <div className="card-grid">
        <div className="card-wide">
          <BudgetCard />
        </div>

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

          <div className="calendar calendar-money">
            {dayNames.map((name, i) => (
              <span key={i} className="calendar-day-name">
                {name}
              </span>
            ))}
            <span className="calendar-day-name">Week</span>

            {weeks.map((week) => {
              // The money I spent from Monday to Sunday. Planned costs are not in it.
              const weekSpent = week.reduce((total, date) => total + spentOn(ledger, date), 0)
              const weekIncome = week.reduce((total, date) => total + incomeOn(ledger, date), 0)
              return (
                <div key={week[0]} className="calendar-week">
                  {week.map((date) => {
                    const spent = spentOn(ledger, date)
                    const income = incomeOn(ledger, date)
                    const coming = (planned.get(date) ?? []).reduce((total, fixed) => total + fixed.cents, 0)
                    const classes = ['day']
                    if (date.slice(0, 7) !== month.slice(0, 7)) classes.push('day-other')
                    if (date === today) classes.push('day-today')
                    if (date === selected) classes.push('day-selected')
                    return (
                      <button key={date} type="button" className={classes.join(' ')} onClick={() => setSelected(date)}>
                        <span className="day-number">{Number(date.slice(8))}</span>
                        {spent > 0 || coming === 0 ? (
                          <span className="day-hours day-money">{spent > 0 ? formatCalendarMoney(spent) : ''}</span>
                        ) : (
                          <span className="day-hours day-planned">{formatCalendarMoney(coming)}</span>
                        )}
                        {income > 0 && <span className="day-hours day-income">+{formatCalendarMoney(income)}</span>}
                      </button>
                    )
                  })}
                  <span className="week-total week-money">
                    {weekSpent > 0 && <span className="day-money">{formatCalendarMoney(weekSpent)}</span>}
                    {weekIncome > 0 && <span className="day-income">+{formatCalendarMoney(weekIncome)}</span>}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="day-detail">
            <div className="calendar-head">
              <p className="card-value">{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <button type="button" className="small-button small-button-fill" onClick={() => setTarget({ date: selected })}>
                Add
              </button>
            </div>
            {items.length === 0 && plannedItems.length === 0 && <p className="muted">Nothing on this day.</p>}
            {plannedItems.map((fixed) => (
              <div key={fixed.id} className="item item-planned">
                <span>
                  <span className="item-title">{fixed.category}</span>
                  <span className="muted item-sub">{fixed.name} · Planned fixed cost</span>
                </span>
                <span className="item-title">{formatMoney(fixed.cents)}</span>
              </div>
            ))}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="item item-button"
                disabled={item.locked}
                onClick={() => setTarget({ date: item.date, item })}
              >
                <span>
                  <span className="item-title">{item.category}</span>
                  {(item.note || item.locked) && (
                    <span className="muted item-sub">{item.locked ? `Pay for ${item.note}` : item.note}</span>
                  )}
                </span>
                <span className={item.kind === 'income' ? 'item-title text-green' : 'item-title'}>
                  {item.kind === 'income' ? '+ ' : ''}
                  {formatMoney(item.cents)}
                </span>
              </button>
            ))}
          </div>
          {error && <p className="text-red">Could not load the records. {error}</p>}
        </section>

        <section className="card">
          <p className="card-label">{formatDate(month, { month: 'long' })}</p>
          <p className="big-number">{formatMoney(sum.spent)}</p>
          <p className="muted">Spent · {formatMoney(sum.income)} income</p>
        </section>

        <section className="card">
          <p className="card-label">Spending by category</p>
          {sum.byCategory.length === 0 && <p className="muted">No spending this month.</p>}
          <div className="bars">
            {sum.byCategory.map((row) => (
              <div key={row.category} className="bar-row" title={`${row.category} ${formatMoney(row.cents)}`}>
                <div className="bar-text">
                  <span>{row.category}</span>
                  <span>{formatMoney(row.cents)}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(row.cents / biggest) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Fab
        label="Add an expense for today"
        onClick={() => {
          setSelected(today)
          setTarget({ date: today })
        }}
      />

      <TxSheet target={target} onClose={() => setTarget(null)} />
    </>
  )
}
