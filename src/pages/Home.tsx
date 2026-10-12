import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Pressable } from '../components/Pressable'

// The numbers are empty for now. Each card gets real data in a later step.
export function Home() {
  const [adding, setAdding] = useState(false)

  return (
    <>
      <h1 className="page-title">Home</h1>

      <div className="card-grid">
        <section className="card">
          <p className="card-label">Work this week</p>
          <p className="big-number">– h</p>
          <p className="muted">– h left of 25 h</p>
          <span className="chip">Step 2</span>
        </section>

        <section className="card">
          <p className="card-label">Pay this period</p>
          <p className="big-number">$ –</p>
          <p className="muted">Next payday –</p>
          <span className="chip">Step 3</span>
        </section>

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
          <Pressable className="row" disabled>
            <span>Work hours</span>
            <span className="chip">Step 2</span>
          </Pressable>
          <Pressable className="row" disabled>
            <span>Expense</span>
            <span className="chip">Step 4</span>
          </Pressable>
        </div>
      </BottomSheet>
    </>
  )
}
