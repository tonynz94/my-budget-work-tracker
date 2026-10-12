import { useState } from 'react'
import { useConfig } from '../lib/config'
import type { Preset } from '../lib/config'
import { formatDate, yearOf } from '../lib/dates'
import { formatClock, formatDuration, parseClock, parseCount } from '../lib/format'
import { useHolidayMap } from '../lib/useHolidays'
import { defaultKind, kindLabels, paidMinutes } from '../lib/work'
import type { WorkEntry, WorkKind } from '../lib/work'
import { useWork } from '../lib/workStore'
import { BottomSheet } from './BottomSheet'
import { Field, Segment } from './Form'
import { Pressable } from './Pressable'

type Mode = 'range' | 'total'

const modeOptions: { value: Mode; label: string }[] = [
  { value: 'range', label: 'Start and end' },
  { value: 'total', label: 'Total hours' },
]

const kinds: WorkKind[] = ['regular', 'holiday_worked', 'holiday_not_worked']

type Props = {
  // The date to add or edit. Null means the sheet is closed.
  date: string | null
  onClose: () => void
}

export function WorkEntrySheet({ date, onClose }: Props) {
  // Keep the last date, so the form stays on screen while the sheet slides away.
  const [shown, setShown] = useState(date)
  if (date && date !== shown) setShown(date)

  const title = shown ? formatDate(shown, { weekday: 'short', day: 'numeric', month: 'short' }) : ''
  return (
    <BottomSheet open={date !== null} title={title} onClose={onClose}>
      {shown && <WorkEntryForm key={shown} date={shown} onClose={onClose} />}
    </BottomSheet>
  )
}

function WorkEntryForm({ date, onClose }: { date: string; onClose: () => void }) {
  const { config } = useConfig()
  const { entries, save, remove } = useWork()
  const holidays = useHolidayMap([yearOf(date)])
  const existing = entries.get(date)
  const holiday = holidays.get(date)

  const [kind, setKind] = useState<WorkKind>(() => existing?.kind ?? defaultKind(date, holidays, entries))
  const [mode, setMode] = useState<Mode>(existing && existing.startMin === null ? 'total' : 'range')
  const [start, setStart] = useState(existing?.startMin != null ? formatClock(existing.startMin) : '')
  const [end, setEnd] = useState(existing?.endMin != null ? formatClock(existing.endMin) : '')
  const [hours, setHours] = useState(existing?.totalMin != null ? String(Math.floor(existing.totalMin / 60)) : '')
  const [minutes, setMinutes] = useState(existing?.totalMin != null ? String(existing.totalMin % 60) : '')
  const [breakText, setBreakText] = useState(String(existing ? existing.breakMin : config.defaultBreakMin))
  const [note, setNote] = useState(existing?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const dayOff = kind === 'holiday_not_worked'
  const useTotal = dayOff || mode === 'total'

  // Returns the entry, or a message that says what is wrong.
  const build = (): WorkEntry | string => {
    const breakMin = dayOff ? 0 : parseCount(breakText)
    if (breakMin === null) return 'Enter the break in minutes.'
    const base = { date, kind, breakMin, note: note.trim() }

    let entry: WorkEntry
    if (useTotal) {
      const h = parseCount(hours)
      const m = parseCount(minutes)
      if (h === null || m === null || m > 59) return 'Enter the hours and minutes as numbers.'
      if (h * 60 + m === 0) return 'Enter the hours.'
      entry = { ...base, startMin: null, endMin: null, totalMin: h * 60 + m }
    } else {
      const startMin = parseClock(start)
      const endMin = parseClock(end)
      if (startMin === null || endMin === null) return 'Choose the start and end time.'
      if (endMin <= startMin) return 'The end time must be after the start time.'
      entry = { ...base, startMin, endMin, totalMin: null }
    }
    if (paidMinutes(entry) <= 0) return 'The break is as long as the shift.'
    return entry
  }

  const draft = build()

  const applyPreset = (preset: Preset) => {
    setError(null)
    setBreakText(String(preset.breakMin))
    if (preset.startMin !== null && preset.endMin !== null) {
      setMode('range')
      setStart(formatClock(preset.startMin))
      setEnd(formatClock(preset.endMin))
    } else {
      setMode('total')
      setHours(String(Math.floor((preset.totalMin ?? 0) / 60)))
      setMinutes(String((preset.totalMin ?? 0) % 60))
    }
  }

  const onSave = async () => {
    if (typeof draft === 'string') {
      setError(draft)
      return
    }
    setBusy(true)
    const message = await save(draft)
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  const onDelete = async () => {
    setBusy(true)
    const message = await remove(date)
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <div className="form">
      {holiday && <p className="text-red form-note">{holiday.name}</p>}

      {!dayOff && config.presets.length > 0 && (
        <div className="chips">
          {config.presets.map((preset) => (
            <Pressable key={preset.id} className="chip-button" onClick={() => applyPreset(preset)}>
              {preset.name}
            </Pressable>
          ))}
        </div>
      )}

      <Field label="Type">
        <select className="input" value={kind} onChange={(event) => setKind(event.target.value as WorkKind)}>
          {kinds.map((value) => (
            <option key={value} value={value}>
              {kindLabels[value]}
            </option>
          ))}
        </select>
      </Field>

      {!dayOff && <Segment label="How to enter the time" options={modeOptions} value={mode} onChange={setMode} />}

      {useTotal ? (
        <div className="field-row">
          <Field label={dayOff ? 'Paid hours' : 'Hours'}>
            <input className="input" inputMode="numeric" placeholder="0" value={hours} onChange={(event) => setHours(event.target.value)} />
          </Field>
          <Field label="Minutes">
            <input className="input" inputMode="numeric" placeholder="0" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="field-row">
          <Field label="Start">
            <input className="input" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </Field>
          <Field label="End">
            <input className="input" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          </Field>
        </div>
      )}

      {!dayOff && (
        <Field label="Unpaid break (minutes)">
          <input className="input" inputMode="numeric" value={breakText} onChange={(event) => setBreakText(event.target.value)} />
        </Field>
      )}

      <Field label="Note (optional)">
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>

      {typeof draft !== 'string' && <p className="form-total">Paid time {formatDuration(paidMinutes(draft))}</p>}
      {error && <p className="text-red form-note">{error}</p>}

      <Pressable className="button button-primary" onClick={onSave} disabled={busy}>
        Save
      </Pressable>
      {existing && (
        <Pressable className="button button-danger" onClick={onDelete} disabled={busy}>
          Delete
        </Pressable>
      )}
    </div>
  )
}
