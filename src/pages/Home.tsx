import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { PayCard } from '../components/PayCard'
import { Pressable } from '../components/Pressable'
import { TxSheet } from '../components/TxSheet'
import type { TxTarget } from '../components/TxSheet'
import { WeekCard } from '../components/WeekCard'
import { WorkEntrySheet } from '../components/WorkEntrySheet'
import { budgetDate, nzDate } from '../lib/nzTime'

// The budget card is empty for now. It gets real data in a later step.
export function Home() {
  const [adding, setAdding] = useState(false)
  const [workDate, setWorkDate] = useState<string | null>(null)
  const [expense, setExpense] = useState<TxTarget | null>(null)

  return (
    <>
      <h1 className="page-title">Home</h1>

      <div className="card-grid">
        <WeekCard />
        <PayCard />

        <section className="card">
          <p className="card-label">Left today</p>
          <p className="big-number">$ –</p>
          <p className="muted">Budget today – · Spent today –</p>
          <span className="chip">Step 5</span>
        </section>
      </div>

      <Pressable className="fab" label="Add" onClick={() => setAdding(true)}>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </Pressable>

      <BottomSheet open={adding} title="Add" onClose={() => setAdding(false)}>
        <div className="list">
          <Pressable
            className="row"
            onClick={() => {
              setAdding(false)
              setExpense({ date: budgetDate() })
            }}
          >
            <span>Expense</span>
            <span className="muted">Today</span>
          </Pressable>
          <Pressable
            className="row"
            onClick={() => {
              setAdding(false)
              setWorkDate(nzDate())
            }}
          >
            <span>Work hours</span>
            <span className="muted">Today</span>
          </Pressable>
        </div>
      </BottomSheet>

      <WorkEntrySheet date={workDate} onClose={() => setWorkDate(null)} />
      <TxSheet target={expense} onClose={() => setExpense(null)} />
    </>
  )
}
