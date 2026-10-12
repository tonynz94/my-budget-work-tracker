import { useState } from 'react'
import { Field, Segment } from '../components/Form'
import { Pressable } from '../components/Pressable'
import { useConfig } from '../lib/config'
import { addDays, formatDate, weekday } from '../lib/dates'
import { nzDate } from '../lib/nzTime'
import { DEFAULT_ACC_RATE, cycleOn, defaultBrackets, defaultCycle, periodFor } from '../lib/pay'
import type { PayCycle, TaxBracket } from '../lib/pay'

const dayMonth = (date: string) => formatDate(date, { day: 'numeric', month: 'short' })
const weekdayDate = (date: string) => formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })

type Weeks = '1' | '2'

const weekOptions: { value: Weeks; label: string }[] = [
  { value: '1', label: 'Every week' },
  { value: '2', label: 'Every 2 weeks' },
]

export function PayCycleForm({ onClose }: { onClose: () => void }) {
  const { config, update } = useConfig()
  const today = nzDate()
  const current = periodFor(today, config.payCycles)
  const active = cycleOn(today, config.payCycles)
  const [weeks, setWeeks] = useState<Weeks>(String(active.weeks) as Weeks)
  const [offset, setOffset] = useState(String(active.paydayOffset))
  const [start, setStart] = useState(current.start)
  const [error, setError] = useState<string | null>(null)

  const offsetDays = /^\d+$/.test(offset.trim()) ? Number(offset.trim()) : null
  const draft = (from: string): PayCycle | null =>
    offsetDays === null ? null : { from, weeks: weeks === '1' ? 1 : 2, paydayOffset: offsetDays }

  // A change always starts on the Monday after this period ends, so no period is cut in half.
  const nextStart = addDays(current.end, 1)
  const nextCycle = draft(nextStart)
  const preview = nextCycle ? periodFor(nextStart, [nextCycle]) : null

  const changeFromNext = () => {
    if (!nextCycle) {
      setError('Enter the days until payday as a number.')
      return
    }
    const base = config.payCycles.length > 0 ? config.payCycles : [defaultCycle]
    update({ payCycles: [...base.filter((cycle) => cycle.from !== nextStart), nextCycle] })
    onClose()
  }

  const setUp = () => {
    const cycle = draft(start)
    if (!cycle || !start) {
      setError('Enter the days until payday as a number and choose a start date.')
      return
    }
    if (weekday(start) !== 0) {
      setError('A pay period starts on a Monday. Choose a Monday.')
      return
    }
    update({ payCycles: [cycle] })
    onClose()
  }

  return (
    <div className="form">
      <p className="muted">
        Now I get paid every {active.weeks === 1 ? 'week' : '2 weeks'}. This period is {dayMonth(current.start)} to{' '}
        {dayMonth(current.end)} and the payday is {weekdayDate(current.payday)}.
      </p>

      <Segment label="How often I get paid" options={weekOptions} value={weeks} onChange={setWeeks} />
      <Field label="Payday, days after the period ends">
        <input className="input" inputMode="numeric" value={offset} onChange={(event) => setOffset(event.target.value)} />
      </Field>

      <p className="section-title">Change from the next period</p>
      {preview && (
        <p className="muted">
          The first new period is {dayMonth(preview.start)} to {dayMonth(preview.end)}. The first payday is{' '}
          {weekdayDate(preview.payday)}. Older periods do not change.
        </p>
      )}
      <Pressable className="button button-primary" onClick={changeFromNext}>
        Change from {dayMonth(nextStart)}
      </Pressable>

      <p className="section-title">First setup</p>
      <p className="muted">Use this only at the start. It moves all the periods, also the old ones.</p>
      <Field label="A Monday when a pay period starts">
        <input className="input" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
      </Field>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-plain" onClick={setUp}>
        Use this start for all periods
      </Pressable>
    </div>
  )
}

export function TaxForm({ onClose }: { onClose: () => void }) {
  const { config, update } = useConfig()
  const [code, setCode] = useState(config.taxCode)
  const [limits, setLimits] = useState(config.taxBrackets.map((bracket) => (bracket.upTo === null ? '' : String(bracket.upTo))))
  const [rates, setRates] = useState(config.taxBrackets.map((bracket) => String(bracket.rate)))
  const [acc, setAcc] = useState(String(config.accRate))
  const [error, setError] = useState<string | null>(null)

  const setAt = (list: string[], index: number, value: string) => list.map((item, i) => (i === index ? value : item))

  const save = () => {
    const brackets: TaxBracket[] = []
    for (let i = 0; i < rates.length; i++) {
      const last = i === rates.length - 1
      const rate = Number(rates[i])
      const upTo = last ? null : Number(limits[i])
      const badLimit = !last && (limits[i].trim() === '' || !Number.isFinite(upTo) || (upTo as number) <= 0)
      if (rates[i].trim() === '' || !Number.isFinite(rate) || rate < 0 || badLimit) {
        setError('Enter all the limits and rates as numbers.')
        return
      }
      brackets.push({ upTo, rate })
    }
    const accRate = Number(acc)
    if (acc.trim() === '' || !Number.isFinite(accRate) || accRate < 0) {
      setError('Enter the ACC rate as a number.')
      return
    }
    update({ taxCode: code.trim().toUpperCase() || 'M', taxBrackets: brackets, accRate })
    onClose()
  }

  const reset = () => {
    setLimits(defaultBrackets.map((bracket) => (bracket.upTo === null ? '' : String(bracket.upTo))))
    setRates(defaultBrackets.map((bracket) => String(bracket.rate)))
    setAcc(String(DEFAULT_ACC_RATE))
    setError(null)
  }

  return (
    <div className="form">
      <p className="muted">This is only used when the hourly rate is before tax. The result is an estimate.</p>
      <Field label="Tax code">
        <input className="input" value={code} onChange={(event) => setCode(event.target.value)} />
      </Field>
      {code.trim().toUpperCase() !== 'M' && (
        <p className="text-red form-note">The app can only calculate tax code M for now. It still uses the M method.</p>
      )}

      <p className="section-title">Income tax rates</p>
      {rates.map((rate, i) => (
        <div key={i} className="field-row">
          {i < rates.length - 1 ? (
            <Field label="Up to ($ a year)">
              <input className="input" inputMode="decimal" value={limits[i]} onChange={(event) => setLimits(setAt(limits, i, event.target.value))} />
            </Field>
          ) : (
            <Field label="Above that">
              <input className="input" value="No limit" disabled />
            </Field>
          )}
          <Field label="Rate (%)">
            <input className="input" inputMode="decimal" value={rate} onChange={(event) => setRates(setAt(rates, i, event.target.value))} />
          </Field>
        </div>
      ))}

      <Field label="ACC earner's levy (%)">
        <input className="input" inputMode="decimal" value={acc} onChange={(event) => setAcc(event.target.value)} />
      </Field>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-primary" onClick={save}>
        Save
      </Pressable>
      <Pressable className="button button-plain" onClick={reset}>
        Fill in the IRD numbers again
      </Pressable>
    </div>
  )
}
