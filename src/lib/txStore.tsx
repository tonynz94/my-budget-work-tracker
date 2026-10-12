import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './auth'
import { useConfig } from './config'
import { addDays } from './dates'
import { occurrences } from './fixed'
import { buildLedger } from './ledger'
import type { Ledger, Tx, TxKind } from './ledger'
import { budgetDate } from './nzTime'
import { supabase } from './supabase'

type Row = {
  id: string
  tx_date: string
  kind: TxKind
  amount_cents: number
  category: string
  note: string
  fixed_id: string | null
}

export type TxDraft = Omit<Tx, 'id' | 'fixedId'> & { id?: string }

type TxStore = {
  // All the records by date. It also has my actual pay as income.
  ledger: Ledger
  error: string | null
  // Loads older records when the calendar goes back in time.
  ensureLoaded: (from: string) => void
  // These return an error message, or null when it worked.
  save: (draft: TxDraft) => Promise<string | null>
  remove: (id: string) => Promise<string | null>
  renameCategory: (from: string, to: string) => Promise<string | null>
}

const TxContext = createContext<TxStore | null>(null)

function fromRow(row: Row): Tx {
  return {
    id: row.id,
    date: row.tx_date,
    kind: row.kind,
    cents: row.amount_cents,
    category: row.category,
    note: row.note,
    fixedId: row.fixed_id,
  }
}

export function TxProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const { config, load, update } = useConfig()
  const [txs, setTxs] = useState<Map<string, Tx>>(new Map())
  const [error, setError] = useState<string | null>(null)
  // The oldest date that is loaded. Everything from this date on is in memory.
  const loadedFrom = useRef<string | null>(null)
  const makingFixed = useRef(false)

  // Loads the records from one date up to another date. No end date means everything after.
  const fetchRange = useCallback(
    async (from: string, before: string | null) => {
      if (!supabase || !userId) return
      let query = supabase.from('transactions').select('*').eq('user_id', userId).gte('tx_date', from)
      if (before) query = query.lt('tx_date', before)
      const { data, error } = await query.order('tx_date')
      if (error) {
        setError(error.message)
        return
      }
      setError(null)
      setTxs((old) => {
        const next = new Map(old)
        // Drop the old copy of this range first, so a record I deleted on another device goes away.
        for (const tx of old.values()) {
          if (tx.date >= from && (!before || tx.date < before)) next.delete(tx.id)
        }
        for (const row of data as Row[]) next.set(row.id, fromRow(row))
        return next
      })
    },
    [userId],
  )

  const ensureLoaded = useCallback(
    (from: string) => {
      const before = loadedFrom.current
      if (before && from >= before) return
      loadedFrom.current = from
      fetchRange(from, before)
    },
    [fetchRange],
  )

  useEffect(() => {
    loadedFrom.current = null
    setTxs(new Map())
    if (!supabase || !userId) return
    ensureLoaded(addDays(budgetDate(), -70))
    const onVisible = () => {
      if (document.visibilityState === 'visible' && loadedFrom.current) fetchRange(loadedFrom.current, null)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, ensureLoaded, fetchRange])

  // Fixed costs. When their date comes, the app writes them into the budget book.
  // This runs when I open the app, so nothing has to run at night.
  useEffect(() => {
    if (!supabase || !userId || load !== 'ready' || makingFixed.current) return
    const client = supabase
    const today = budgetDate()
    const due = config.fixedCosts.filter((fixed) => fixed.start <= today && (fixed.doneThrough ?? '') < today)
    if (due.length === 0) return

    makingFixed.current = true
    const run = async () => {
      const rows = due.flatMap((fixed) => {
        const from = fixed.doneThrough ? addDays(fixed.doneThrough, 1) : fixed.start
        return occurrences(fixed, from, today).map((date) => ({
          user_id: userId,
          tx_date: date,
          kind: 'expense',
          amount_cents: fixed.cents,
          category: fixed.category,
          note: fixed.name,
          fixed_id: fixed.id,
        }))
      })
      if (rows.length > 0) {
        // The same cost on the same date is saved only once, also when my phone and my laptop both try.
        const { error } = await client
          .from('transactions')
          .upsert(rows, { onConflict: 'user_id,fixed_id,tx_date', ignoreDuplicates: true })
        if (error) {
          setError(error.message)
          makingFixed.current = false
          return
        }
        const oldest = rows.reduce((min, row) => (row.tx_date < min ? row.tx_date : min), today)
        const from = loadedFrom.current && loadedFrom.current < oldest ? loadedFrom.current : oldest
        loadedFrom.current = from
        await fetchRange(from, null)
      }
      const doneIds = new Set(due.map((fixed) => fixed.id))
      update({
        fixedCosts: config.fixedCosts.map((fixed) => (doneIds.has(fixed.id) ? { ...fixed, doneThrough: today } : fixed)),
      })
      makingFixed.current = false
    }
    run()
  }, [userId, load, config.fixedCosts, update, fetchRange])

  const save = useCallback(
    async (draft: TxDraft) => {
      const old = draft.id ? txs.get(draft.id) : undefined
      let saved: Tx = { ...draft, id: draft.id ?? crypto.randomUUID(), fixedId: old?.fixedId ?? null }
      if (supabase && userId) {
        const { data, error } = await supabase
          .from('transactions')
          .upsert({
            id: saved.id,
            user_id: userId,
            tx_date: saved.date,
            kind: saved.kind,
            amount_cents: saved.cents,
            category: saved.category,
            note: saved.note,
            fixed_id: saved.fixedId,
          })
          .select()
          .single()
        if (error) return error.message
        saved = fromRow(data as Row)
      }
      setTxs((map) => new Map(map).set(saved.id, saved))
      return null
    },
    [userId, txs],
  )

  const remove = useCallback(
    async (id: string) => {
      if (supabase && userId) {
        const { error } = await supabase.from('transactions').delete().eq('user_id', userId).eq('id', id)
        if (error) return error.message
      }
      setTxs((map) => {
        const next = new Map(map)
        next.delete(id)
        return next
      })
      return null
    },
    [userId],
  )

  const renameCategory = useCallback(
    async (from: string, to: string) => {
      if (supabase && userId) {
        const { error } = await supabase
          .from('transactions')
          .update({ category: to })
          .eq('user_id', userId)
          .eq('category', from)
        if (error) return error.message
      }
      setTxs((map) => {
        const next = new Map(map)
        for (const tx of map.values()) {
          if (tx.category === from) next.set(tx.id, { ...tx, category: to })
        }
        return next
      })
      return null
    },
    [userId],
  )

  const ledger = useMemo(
    () => buildLedger(txs.values(), config.actualPays, config.payCycles),
    [txs, config.actualPays, config.payCycles],
  )

  return (
    <TxContext.Provider value={{ ledger, error, ensureLoaded, save, remove, renameCategory }}>
      {children}
    </TxContext.Provider>
  )
}

export function useTx(): TxStore {
  const store = useContext(TxContext)
  if (!store) throw new Error('useTx must be used inside TxProvider')
  return store
}
