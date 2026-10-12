import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './auth'
import { addDays } from './dates'
import { nzDate } from './nzTime'
import { supabase } from './supabase'
import type { WorkEntry, WorkKind } from './work'

type Row = {
  work_date: string
  kind: WorkKind
  start_min: number | null
  end_min: number | null
  total_min: number | null
  break_min: number
  note: string
}

type WorkStore = {
  entries: ReadonlyMap<string, WorkEntry>
  error: string | null
  // Loads older records when the calendar goes back in time.
  ensureLoaded: (from: string) => void
  // These return an error message, or null when it worked.
  save: (entry: WorkEntry) => Promise<string | null>
  remove: (date: string) => Promise<string | null>
}

const WorkContext = createContext<WorkStore | null>(null)

function fromRow(row: Row): WorkEntry {
  return {
    date: row.work_date,
    kind: row.kind,
    startMin: row.start_min,
    endMin: row.end_min,
    totalMin: row.total_min,
    breakMin: row.break_min,
    note: row.note,
  }
}

export function WorkProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const [entries, setEntries] = useState<Map<string, WorkEntry>>(new Map())
  const [error, setError] = useState<string | null>(null)
  // The oldest date that is loaded. Everything from this date until now is in memory.
  const loadedFrom = useRef<string | null>(null)

  // Loads the records from one date up to another date. No end date means until now.
  const fetchRange = useCallback(
    async (from: string, before: string | null) => {
      if (!supabase || !userId) return
      let query = supabase.from('work_entries').select('*').eq('user_id', userId).gte('work_date', from)
      if (before) query = query.lt('work_date', before)
      const { data, error } = await query.order('work_date')
      if (error) {
        setError(error.message)
        return
      }
      setError(null)
      setEntries((old) => {
        const next = new Map(old)
        // Drop the old copy of this range first, so a record I deleted on another device goes away.
        for (const date of old.keys()) {
          if (date >= from && (!before || date < before)) next.delete(date)
        }
        for (const row of data as Row[]) next.set(row.work_date, fromRow(row))
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
    setEntries(new Map())
    if (!supabase || !userId) return
    ensureLoaded(addDays(nzDate(), -70))
    const onVisible = () => {
      if (document.visibilityState === 'visible' && loadedFrom.current) fetchRange(loadedFrom.current, null)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, ensureLoaded, fetchRange])

  const save = useCallback(
    async (entry: WorkEntry) => {
      if (supabase && userId) {
        const { error } = await supabase.from('work_entries').upsert({
          user_id: userId,
          work_date: entry.date,
          kind: entry.kind,
          start_min: entry.startMin,
          end_min: entry.endMin,
          total_min: entry.totalMin,
          break_min: entry.breakMin,
          note: entry.note,
          updated_at: new Date().toISOString(),
        })
        if (error) return error.message
      }
      setEntries((old) => new Map(old).set(entry.date, entry))
      return null
    },
    [userId],
  )

  const remove = useCallback(
    async (date: string) => {
      if (supabase && userId) {
        const { error } = await supabase.from('work_entries').delete().eq('user_id', userId).eq('work_date', date)
        if (error) return error.message
      }
      setEntries((old) => {
        const next = new Map(old)
        next.delete(date)
        return next
      })
      return null
    },
    [userId],
  )

  return (
    <WorkContext.Provider value={{ entries, error, ensureLoaded, save, remove }}>{children}</WorkContext.Provider>
  )
}

export function useWork(): WorkStore {
  const store = useContext(WorkContext)
  if (!store) throw new Error('useWork must be used inside WorkProvider')
  return store
}
