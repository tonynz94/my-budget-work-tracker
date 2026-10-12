import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { BudgetCard } from '../components/BudgetCard'
import { Fab } from '../components/Fab'
import { PayCard } from '../components/PayCard'
import { Pressable } from '../components/Pressable'
import { TxSheet } from '../components/TxSheet'
import type { TxTarget } from '../components/TxSheet'
import { WeekCard } from '../components/WeekCard'
import { WorkEntrySheet } from '../components/WorkEntrySheet'
import { budgetDate, nzDate } from '../lib/nzTime'

// The three things I check every day. Money for today, work hours this week and my pay.
export function Home() {
  const [adding, setAdding] = useState(false)
  const [workDate, setWorkDate] = useState<string | null>(null)
  const [expense, setExpense] = useState<TxTarget | null>(null)

  return (
    <>
      <h1 className="page-title">Home</h1>

      <div className="card-grid">
        <BudgetCard />
        <WeekCard />
        <PayCard />
      </div>

      <Fab label="Add" onClick={() => setAdding(true)} />

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
