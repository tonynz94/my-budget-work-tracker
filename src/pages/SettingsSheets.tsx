import { useState } from 'react'
import { Field, Segment } from '../components/Form'
import { Pressable } from '../components/Pressable'
import { useConfig } from '../lib/config'
import type { Preset, RateMode } from '../lib/config'
import { formatDate, weekStart, yearOf } from '../lib/dates'
import { formatClock, formatDuration, formatMoney, parseClock, parseCount, parseMoney } from '../lib/format'
import { nzHolidays } from '../lib/holidays'
import { nzDate } from '../lib/nzTime'
import { limitForWeek } from '../lib/work'

const shortDate = (date: string) => formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' })

const rateModes: { value: RateMode; label: string }[] = [
  { value: 'gross', label: 'Before tax' },
  { value: 'net', label: 'After tax' },
]

type ItemProps = { title: string; text?: string; action: string; onAction: () => void; faded?: boolean }

// One line in a list with a small button on the right.
function Item({ title, text, action, onAction, faded }: ItemProps) {
  return (
    <div className={faded ? 'item item-faded' : 'item'}>
      <div>
        <p className="item-title">{title}</p>
        {text && <p className="muted">{text}</p>}
      </div>
      <button type="button" className="small-button" onClick={onAction}>
        {action}
      </button>
    </div>
  )
}

export function JobForm({ onClose }: { onClose: () => void }) {
  const { config, update } = useConfig()
  const rates = [...config.rates].sort((a, b) => b.from.localeCompare(a.from))
  const [name, setName] = useState(config.jobName)
  const [breakText, setBreakText] = useState(String(config.defaultBreakMin))
  const [mode, setMode] = useState<RateMode>(rates[0]?.mode ?? 'gross')
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState(nzDate())
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const breakMin = parseCount(breakText)
    if (breakMin === null) {
      setError('Enter the break in minutes.')
      return
    }
    update({ jobName: name.trim(), defaultBreakMin: breakMin })
    onClose()
  }

  const addRate = () => {
    const cents = parseMoney(amount)
    if (!cents || !from) {
      setError('Enter the hourly rate and the start date.')
      return
    }
    setError(null)
    setAmount('')
    update({ rates: [...config.rates.filter((rate) => rate.from !== from), { from, cents, mode }] })
  }

  return (
    <div className="form">
      <Field label="Job name">
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Default unpaid break (minutes)">
        <input className="input" inputMode="numeric" value={breakText} onChange={(event) => setBreakText(event.target.value)} />
      </Field>
      <Pressable className="button button-primary" onClick={save}>
        Save
      </Pressable>

      <p className="section-title">Hourly rate</p>
      <p className="muted">A new rate starts from its date. Older records keep the old rate.</p>
      {rates.map((rate) => (
        <Item
          key={rate.from}
          title={`${formatMoney(rate.cents)} ${rate.mode === 'gross' ? 'before tax' : 'after tax'}`}
          text={`From ${shortDate(rate.from)}`}
          action="Delete"
          onAction={() => update({ rates: config.rates.filter((item) => item.from !== rate.from) })}
        />
      ))}
      <Segment label="Rate type" options={rateModes} value={mode} onChange={setMode} />
      <div className="field-row">
        <Field label="Hourly rate ($)">
          <input className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label="From">
          <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
      </div>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-plain" onClick={addRate}>
        Add rate
      </Pressable>
    </div>
  )
}

export function LimitForm({ onClose }: { onClose: () => void }) {
  const { config, update } = useConfig()
  const thisWeek = weekStart(nzDate())
  const [hours, setHours] = useState(String(limitForWeek(thisWeek, config.limits) / 60))
  const [error, setError] = useState<string | null>(null)
  const history = [...config.limits].sort((a, b) => b.fromWeek.localeCompare(a.fromWeek))

  const save = () => {
    const value = Number(hours)
    if (hours.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setError('Enter the hours as a number.')
      return
    }
    const minutes = Math.round(value * 60)
    update({ limits: [...config.limits.filter((item) => item.fromWeek !== thisWeek), { fromWeek: thisWeek, minutes }] })
    onClose()
  }

  return (
    <div className="form">
      <Field label="Hours I can work in a week">
        <input className="input" inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} />
      </Field>
      <p className="muted">The new limit starts from this week. Past weeks keep the limit they had.</p>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-primary" onClick={save}>
        Save
      </Pressable>

      {history.length > 0 && <p className="section-title">Changes</p>}
      {history.map((item) => (
        <Item
          key={item.fromWeek}
          title={formatDuration(item.minutes)}
          text={`From the week of ${shortDate(item.fromWeek)}`}
          action="Delete"
          onAction={() => update({ limits: config.limits.filter((limit) => limit.fromWeek !== item.fromWeek) })}
        />
      ))}
    </div>
  )
}

export function VacationForm() {
  const { config, update } = useConfig()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const list = [...config.vacations].sort((a, b) => b.start.localeCompare(a.start))

  const add = () => {
    if (!start || !end || end < start) {
      setError('Choose a start date and an end date. The end can not be before the start.')
      return
    }
    setError(null)
    setStart('')
    setEnd('')
    update({ vacations: [...config.vacations, { id: crypto.randomUUID(), start, end }] })
  }

  return (
    <div className="form">
      <p className="muted">There is no weekly limit during a vacation. Hours on these days do not count.</p>
      {list.map((item) => (
        <Item
          key={item.id}
          title={`${shortDate(item.start)} to ${shortDate(item.end)}`}
          action="Delete"
          onAction={() => update({ vacations: config.vacations.filter((vacation) => vacation.id !== item.id) })}
        />
      ))}
      <div className="field-row">
        <Field label="First day">
          <input className="input" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </Field>
        <Field label="Last day">
          <input className="input" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
        </Field>
      </div>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-primary" onClick={add}>
        Add vacation
      </Pressable>
    </div>
  )
}

export function HolidayForm() {
  const { config, update } = useConfig()
  const [year, setYear] = useState(yearOf(nzDate()))
  const [multiplier, setMultiplier] = useState(String(config.holidayMultiplier))
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const custom = config.customHolidays.filter((item) => yearOf(item.date) === year)

  const saveMultiplier = () => {
    const value = Number(multiplier)
    if (multiplier.trim() === '' || !Number.isFinite(value) || value < 1) {
      setError('The pay rate must be 1 or more.')
      return
    }
    setError(null)
    update({ holidayMultiplier: value })
  }

  const add = () => {
    if (!date || !name.trim()) {
      setError('Choose a date and enter a name.')
      return
    }
    setError(null)
    update({
      customHolidays: [...config.customHolidays.filter((item) => item.date !== date), { date, name: name.trim() }],
    })
    setYear(yearOf(date))
    setDate('')
    setName('')
  }

  const toggle = (holidayDate: string) => {
    const removed = config.removedHolidays.includes(holidayDate)
    update({
      removedHolidays: removed
        ? config.removedHolidays.filter((item) => item !== holidayDate)
        : [...config.removedHolidays, holidayDate],
    })
  }

  return (
    <div className="form">
      <div className="field-row">
        <Field label="Pay rate on a public holiday">
          <input className="input" inputMode="decimal" value={multiplier} onChange={(event) => setMultiplier(event.target.value)} />
        </Field>
        <Pressable className="button button-plain button-inline" onClick={saveMultiplier}>
          Save
        </Pressable>
      </div>

      <div className="calendar-head">
        <Pressable className="icon-button" label="Previous year" onClick={() => setYear(year - 1)}>
          ‹
        </Pressable>
        <p className="calendar-title">{year} · Auckland</p>
        <Pressable className="icon-button" label="Next year" onClick={() => setYear(year + 1)}>
          ›
        </Pressable>
      </div>

      {nzHolidays(year).map((holiday) => {
        const removed = config.removedHolidays.includes(holiday.date)
        return (
          <Item
            key={holiday.date}
            title={holiday.name}
            text={formatDate(holiday.date, { weekday: 'short', day: 'numeric', month: 'short' })}
            action={removed ? 'Restore' : 'Remove'}
            onAction={() => toggle(holiday.date)}
            faded={removed}
          />
        )
      })}
      {custom.map((item) => (
        <Item
          key={item.date}
          title={item.name}
          text={`${formatDate(item.date, { weekday: 'short', day: 'numeric', month: 'short' })} · Added by me`}
          action="Delete"
          onAction={() => update({ customHolidays: config.customHolidays.filter((other) => other.date !== item.date) })}
        />
      ))}

      <p className="section-title">Add a holiday</p>
      <div className="field-row">
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Name">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
      </div>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-primary" onClick={add}>
        Add holiday
      </Pressable>
    </div>
  )
}

type PresetMode = 'range' | 'total'

const presetModes: { value: PresetMode; label: string }[] = [
  { value: 'range', label: 'Start and end' },
  { value: 'total', label: 'Total hours' },
]

function describePreset(preset: Preset): string {
  const time =
    preset.startMin !== null && preset.endMin !== null
      ? `${formatClock(preset.startMin)} to ${formatClock(preset.endMin)}`
      : formatDuration(preset.totalMin ?? 0)
  return `${time} · ${preset.breakMin}m break`
}

export function PresetForm() {
  const { config, update } = useConfig()
  const [name, setName] = useState('')
  const [mode, setMode] = useState<PresetMode>('range')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [breakText, setBreakText] = useState(String(config.defaultBreakMin))
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    const breakMin = parseCount(breakText)
    if (!name.trim() || breakMin === null) {
      setError('Enter a name and the break in minutes.')
      return
    }
    let preset: Preset
    if (mode === 'range') {
      const startMin = parseClock(start)
      const endMin = parseClock(end)
      if (startMin === null || endMin === null || endMin <= startMin) {
        setError('Choose a start time and a later end time.')
        return
      }
      preset = { id: crypto.randomUUID(), name: name.trim(), startMin, endMin, totalMin: null, breakMin }
    } else {
      const h = parseCount(hours)
      const m = parseCount(minutes)
      if (h === null || m === null || m > 59 || h * 60 + m === 0) {
        setError('Enter the hours and minutes as numbers.')
        return
      }
      preset = { id: crypto.randomUUID(), name: name.trim(), startMin: null, endMin: null, totalMin: h * 60 + m, breakMin }
    }
    setError(null)
    setName('')
    update({ presets: [...config.presets, preset] })
  }

  return (
    <div className="form">
      <p className="muted">A preset fills in a shift with one tap.</p>
      {config.presets.map((preset) => (
        <Item
          key={preset.id}
          title={preset.name}
          text={describePreset(preset)}
          action="Delete"
          onAction={() => update({ presets: config.presets.filter((item) => item.id !== preset.id) })}
        />
      ))}

      <p className="section-title">Add a preset</p>
      <Field label="Name">
        <input className="input" placeholder="Morning shift" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Segment label="How to enter the time" options={presetModes} value={mode} onChange={setMode} />
      {mode === 'range' ? (
        <div className="field-row">
          <Field label="Start">
            <input className="input" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </Field>
          <Field label="End">
            <input className="input" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="field-row">
          <Field label="Hours">
            <input className="input" inputMode="numeric" placeholder="0" value={hours} onChange={(event) => setHours(event.target.value)} />
          </Field>
          <Field label="Minutes">
            <input className="input" inputMode="numeric" placeholder="0" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
          </Field>
        </div>
      )}
      <Field label="Unpaid break (minutes)">
        <input className="input" inputMode="numeric" value={breakText} onChange={(event) => setBreakText(event.target.value)} />
      </Field>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-primary" onClick={add}>
        Add preset
      </Pressable>
    </div>
  )
}
