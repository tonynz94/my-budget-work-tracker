import { useState } from 'react'
import { Pressable } from '../components/Pressable'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'
import { budgetCsv, saveCsv, workCsv } from '../lib/csv'
import { readAllTx, readAllWork } from '../lib/exportData'
import { payIncomes } from '../lib/ledger'
import { nzDate } from '../lib/nzTime'
import { useTx } from '../lib/txStore'
import { useWork } from '../lib/workStore'

// Saves all my records as CSV files. I can open them in Excel.
export function ExportCard() {
  const { userId } = useAuth()
  const { config } = useConfig()
  const { entries } = useWork()
  const { ledger } = useTx()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (make: () => Promise<{ name: string; text: string; count: number }>) => {
    setBusy(true)
    setMessage(null)
    try {
      const { name, text, count } = await make()
      await saveCsv(name, text)
      setMessage(`${count} records in ${name}`)
    } catch (error) {
      setMessage(error instanceof Error ? `Could not export. ${error.message}` : 'Could not export.')
    }
    setBusy(false)
  }

  // Logged in, the files have every record from the server. In preview they have what is on screen.
  const exportWork = () =>
    run(async () => {
      const all = userId ? await readAllWork(userId) : [...entries.values()]
      return { name: `work-${nzDate()}.csv`, text: workCsv(all), count: all.length }
    })

  const exportBudget = () =>
    run(async () => {
      const all = userId
        ? [
            ...(await readAllTx(userId)).map((tx) => ({ ...tx, locked: false })),
            ...payIncomes(config.actualPays, config.payCycles),
          ]
        : [...ledger.values()].flat()
      return { name: `budget-${nzDate()}.csv`, text: budgetCsv(all), count: all.length }
    })

  return (
    <section className="card">
      <p className="card-label">Export</p>
      <div className="list">
        <Pressable className="row" onClick={exportWork} disabled={busy}>
          <span>Work records</span>
          <span className="muted">CSV</span>
        </Pressable>
        <Pressable className="row" onClick={exportBudget} disabled={busy}>
          <span>Budget records</span>
          <span className="muted">CSV</span>
        </Pressable>
      </div>
      {message && <p className="muted">{message}</p>}
    </section>
  )
}
