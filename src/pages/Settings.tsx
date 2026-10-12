import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Segment } from '../components/Form'
import { Pressable } from '../components/Pressable'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'
import type { SyncState, ThemeMode } from '../lib/config'
import { weekStart } from '../lib/dates'
import { formatDuration, formatMoney } from '../lib/format'
import { nzDate } from '../lib/nzTime'
import { limitForWeek } from '../lib/work'
import { cycleOn } from '../lib/pay'
import { CategoryForm, FixedCostForm } from './BudgetSettings'
import { ExportCard } from './ExportCard'
import { PayCycleForm, TaxForm } from './PaySettings'
import { HolidayForm, JobForm, LimitForm, PresetForm, VacationForm } from './SettingsSheets'

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const syncText: Record<SyncState, string> = {
  local: 'Saved on this device only',
  syncing: 'Syncing',
  synced: 'Synced with the server',
  error: 'Sync failed. Check the internet and try again.',
}

type Sheet = 'job' | 'cycle' | 'tax' | 'limit' | 'vacation' | 'holiday' | 'preset' | 'fixed' | 'category'

const sheetTitles: Record<Sheet, string> = {
  job: 'Job',
  cycle: 'Pay cycle',
  tax: 'Tax',
  limit: 'Weekly limit',
  vacation: 'Vacation periods',
  holiday: 'Public holidays',
  preset: 'Presets',
  fixed: 'Fixed costs',
  category: 'Categories',
}

export function Settings() {
  const auth = useAuth()
  const { config, update, sync } = useConfig()
  const [open, setOpen] = useState<Sheet | null>(null)
  // Keep the last sheet, so its content stays on screen while it slides away.
  const [shown, setShown] = useState<Sheet>('job')
  if (open && open !== shown) setShown(open)
  const close = () => setOpen(null)

  const today = nzDate()
  const rate = [...config.rates].sort((a, b) => b.from.localeCompare(a.from)).find((item) => item.from <= today)
  const rows: { sheet: Sheet; value: string }[] = [
    { sheet: 'job', value: rate ? `${formatMoney(rate.cents)} an hour` : 'Not set' },
    { sheet: 'cycle', value: cycleOn(today, config.payCycles).weeks === 1 ? 'Every week' : 'Every 2 weeks' },
    { sheet: 'tax', value: `Code ${config.taxCode}` },
    { sheet: 'limit', value: formatDuration(limitForWeek(weekStart(today), config.limits)) },
    { sheet: 'vacation', value: String(config.vacations.length) },
    { sheet: 'holiday', value: `x${config.holidayMultiplier}` },
    { sheet: 'preset', value: String(config.presets.length) },
  ]
  const budgetRows: { sheet: Sheet; value: string }[] = [
    { sheet: 'fixed', value: String(config.fixedCosts.length) },
    { sheet: 'category', value: String(config.categories.length) },
  ]

  return (
    <>
      <h1 className="page-title">Settings</h1>

      <div className="card-grid">
        <section className="card">
          <p className="card-label">Work and pay</p>
          <div className="list">
            {rows.map((row) => (
              <Pressable key={row.sheet} className="row" onClick={() => setOpen(row.sheet)}>
                <span>{sheetTitles[row.sheet]}</span>
                <span className="muted">{row.value} ›</span>
              </Pressable>
            ))}
          </div>
        </section>

        <section className="card">
          <p className="card-label">Budget</p>
          <div className="list">
            {budgetRows.map((row) => (
              <Pressable key={row.sheet} className="row" onClick={() => setOpen(row.sheet)}>
                <span>{sheetTitles[row.sheet]}</span>
                <span className="muted">{row.value} ›</span>
              </Pressable>
            ))}
          </div>
        </section>

        <section className="card">
          <p className="card-label">Appearance</p>
          <Segment label="Appearance" options={themeModes} value={config.theme} onChange={(theme) => update({ theme })} />
          <p className={sync === 'error' ? 'muted text-red' : 'muted'}>{syncText[sync]}</p>
        </section>

        <ExportCard />

        <section className="card">
          <p className="card-label">Account</p>
          <p className="card-value">{auth.email ?? 'Preview mode, not logged in'}</p>
          <p className="muted">Today in New Zealand is {today}</p>
          <Pressable className="button button-plain" onClick={auth.signOut}>
            {auth.status === 'preview' ? 'Leave preview' : 'Log out'}
          </Pressable>
        </section>
      </div>

      <BottomSheet open={open !== null} title={sheetTitles[shown]} onClose={close}>
        {shown === 'job' && <JobForm onClose={close} />}
        {shown === 'cycle' && <PayCycleForm onClose={close} />}
        {shown === 'tax' && <TaxForm onClose={close} />}
        {shown === 'limit' && <LimitForm onClose={close} />}
        {shown === 'vacation' && <VacationForm />}
        {shown === 'holiday' && <HolidayForm />}
        {shown === 'preset' && <PresetForm />}
        {shown === 'fixed' && <FixedCostForm />}
        {shown === 'category' && <CategoryForm />}
      </BottomSheet>
    </>
  )
}
