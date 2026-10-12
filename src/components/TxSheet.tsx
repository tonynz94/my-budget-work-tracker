import { useState } from 'react'
import { useConfig } from '../lib/config'
import { parseMoney } from '../lib/format'
import { INCOME_CATEGORY } from '../lib/ledger'
import type { LedgerItem, TxKind } from '../lib/ledger'
import { useTx } from '../lib/txStore'
import { BottomSheet } from './BottomSheet'
import { Field, Segment } from './Form'
import { Pressable } from './Pressable'

const kindOptions: { value: TxKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

// What the sheet adds or edits. A new record only has a date.
export type TxTarget = { date: string; item?: LedgerItem }

type Props = {
  // Null means the sheet is closed.
  target: TxTarget | null
  onClose: () => void
}

export function TxSheet({ target, onClose }: Props) {
  // Keep the last target, so the form stays on screen while the sheet slides away.
  const [shown, setShown] = useState(target)
  if (target && target !== shown) setShown(target)

  return (
    <BottomSheet open={target !== null} title={shown?.item ? 'Edit' : 'Add'} onClose={onClose}>
      {shown && <TxForm key={shown.item?.id ?? `new-${shown.date}`} target={shown} onClose={onClose} />}
    </BottomSheet>
  )
}

function TxForm({ target, onClose }: { target: TxTarget; onClose: () => void }) {
  const { config } = useConfig()
  const { save, remove } = useTx()
  const item = target.item
  const fallback = config.categories.includes('Other') ? 'Other' : (config.categories[0] ?? 'Other')

  const [kind, setKind] = useState<TxKind>(item?.kind ?? 'expense')
  const [amount, setAmount] = useState(item ? (item.cents / 100).toFixed(2) : '')
  const [category, setCategory] = useState(item && item.kind === 'expense' ? item.category : fallback)
  const [date, setDate] = useState(target.date)
  const [note, setNote] = useState(item?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // An old record can have a category that I deleted later. It still shows here.
  const categories = config.categories.includes(category) ? config.categories : [...config.categories, category]

  const onSave = async () => {
    const cents = parseMoney(amount)
    if (!cents) {
      setError('Enter the amount as a number.')
      return
    }
    if (!date) {
      setError('Choose a date.')
      return
    }
    setBusy(true)
    const message = await save({
      id: item?.id,
      date,
      kind,
      cents,
      category: kind === 'income' ? INCOME_CATEGORY : category,
      note: note.trim(),
    })
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  const onDelete = async () => {
    if (!item) return
    setBusy(true)
    const message = await remove(item.id)
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <div className="form">
      <Segment label="Type" options={kindOptions} value={kind} onChange={setKind} />

      <Field label="Amount ($)">
        <input
          className="input input-big"
          inputMode="decimal"
          placeholder="0.00"
          autoFocus={!item}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>

      {kind === 'expense' && (
        <div className="chips" role="radiogroup" aria-label="Category">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={category === name}
              className={category === name ? 'chip-button chip-on' : 'chip-button chip-off'}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="field-row">
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>

      {item?.fixedId && <p className="muted">The app made this record from a fixed cost.</p>}
      {error && <p className="text-red form-note">{error}</p>}

      <Pressable className="button button-primary" onClick={onSave} disabled={busy}>
        Save
      </Pressable>
      {item && (
        <Pressable className="button button-danger" onClick={onDelete} disabled={busy}>
          Delete
        </Pressable>
      )}
    </div>
  )
}
