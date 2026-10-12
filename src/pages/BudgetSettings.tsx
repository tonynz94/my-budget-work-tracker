import { useState } from 'react'
import { Field, Segment } from '../components/Form'
import { Pressable } from '../components/Pressable'
import { useConfig } from '../lib/config'
import { formatDate } from '../lib/dates'
import { repeatLabels } from '../lib/fixed'
import type { FixedCost, Repeat } from '../lib/fixed'
import { formatMoney, parseMoney } from '../lib/format'
import { budgetDate } from '../lib/nzTime'
import { useTx } from '../lib/txStore'

const shortDate = (date: string) => formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' })

export function CategoryForm() {
  const { config, update } = useConfig()
  const { renameCategory } = useTx()
  const [name, setName] = useState('')
  // The category I am renaming. Null means I am adding a new one.
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const next = name.trim()
    if (!next) {
      setError('Enter a name.')
      return
    }
    if (next !== editing && config.categories.includes(next)) {
      setError('This category is already in the list.')
      return
    }
    if (editing) {
      // The old records move to the new name too.
      const message = await renameCategory(editing, next)
      if (message) {
        setError(message)
        return
      }
      update({
        categories: config.categories.map((item) => (item === editing ? next : item)),
        fixedCosts: config.fixedCosts.map((fixed) => (fixed.category === editing ? { ...fixed, category: next } : fixed)),
      })
    } else {
      update({ categories: [...config.categories, next] })
    }
    setError(null)
    setEditing(null)
    setName('')
  }

  return (
    <div className="form">
      {config.categories.map((item) => (
        <div key={item} className="item">
          <p className="item-title">{item}</p>
          <div className="item-actions">
            <button
              type="button"
              className="small-button"
              onClick={() => {
                setEditing(item)
                setName(item)
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="small-button"
              onClick={() => update({ categories: config.categories.filter((other) => other !== item) })}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <p className="muted">Old records keep their category when I delete it here.</p>

      <p className="section-title">{editing ? `Rename ${editing}` : 'Add a category'}</p>
      <Field label="Name">
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-primary" onClick={save}>
        {editing ? 'Save the new name' : 'Add category'}
      </Pressable>
    </div>
  )
}

const repeatOptions: { value: Repeat; label: string }[] = [
  { value: 'weekly', label: 'Week' },
  { value: 'fortnightly', label: '2 weeks' },
  { value: 'monthly', label: 'Month' },
]

export function FixedCostForm() {
  const { config, update } = useConfig()
  const firstCategory = config.categories[0] ?? 'Other'
  // The fixed cost I am editing. Null means I am adding a new one.
  const [editing, setEditing] = useState<FixedCost | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(firstCategory)
  const [repeat, setRepeat] = useState<Repeat>('monthly')
  const [start, setStart] = useState(budgetDate())
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)

  const clear = () => {
    setEditing(null)
    setName('')
    setAmount('')
    setCategory(firstCategory)
    setRepeat('monthly')
    setStart(budgetDate())
    setEnd('')
    setError(null)
  }

  const edit = (fixed: FixedCost) => {
    setEditing(fixed)
    setName(fixed.name)
    setAmount((fixed.cents / 100).toFixed(2))
    setCategory(fixed.category)
    setRepeat(fixed.repeat)
    setStart(fixed.start)
    setEnd(fixed.end ?? '')
    setError(null)
  }

  const save = () => {
    const cents = parseMoney(amount)
    if (!name.trim() || !cents || !start) {
      setError('Enter a name, an amount and a start date.')
      return
    }
    if (end && end < start) {
      setError('The end date can not be before the start date.')
      return
    }
    const fixed: FixedCost = {
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      cents,
      category,
      repeat,
      start,
      end: end || null,
      // An edit only changes the records that come later. The old ones stay as they are.
      doneThrough: editing?.doneThrough ?? null,
    }
    update({ fixedCosts: [...config.fixedCosts.filter((item) => item.id !== fixed.id), fixed] })
    clear()
  }

  const remove = () => {
    if (!editing) return
    update({ fixedCosts: config.fixedCosts.filter((item) => item.id !== editing.id) })
    clear()
  }

  const categories = config.categories.includes(category) ? config.categories : [...config.categories, category]

  return (
    <div className="form">
      <p className="muted">When the date comes, the app writes the cost into the budget book.</p>
      {config.fixedCosts.map((fixed) => (
        <div key={fixed.id} className="item">
          <div>
            <p className="item-title">
              {fixed.name} · {formatMoney(fixed.cents)}
            </p>
            <p className="muted">
              {repeatLabels[fixed.repeat]} · {fixed.category} · from {shortDate(fixed.start)}
              {fixed.end ? ` to ${shortDate(fixed.end)}` : ''}
            </p>
          </div>
          <button type="button" className="small-button" onClick={() => edit(fixed)}>
            Edit
          </button>
        </div>
      ))}

      <p className="section-title">{editing ? `Edit ${editing.name}` : 'Add a fixed cost'}</p>
      <div className="field-row">
        <Field label="Name">
          <input className="input" placeholder="Rent" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Amount ($)">
          <input className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </Field>
      </div>
      <Field label="Category">
        <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </Field>
      <Segment label="Repeats every" options={repeatOptions} value={repeat} onChange={setRepeat} />
      <div className="field-row">
        <Field label="First date">
          <input className="input" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </Field>
        <Field label="Last date (optional)">
          <input className="input" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
        </Field>
      </div>
      {error && <p className="text-red form-note">{error}</p>}
      <Pressable className="button button-primary" onClick={save}>
        {editing ? 'Save' : 'Add fixed cost'}
      </Pressable>
      {editing && (
        <>
          <Pressable className="button button-danger" onClick={remove}>
            Delete
          </Pressable>
          <Pressable className="button button-plain" onClick={clear}>
            Cancel
          </Pressable>
        </>
      )}
    </div>
  )
}
