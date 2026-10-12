import type { Tx } from './ledger'
import { supabase } from './supabase'
import type { WorkEntry } from './work'

const PAGE = 1000

// Reads every row of a table. The server gives at most 1000 rows at a time, so this asks again until the end.
async function readAll(table: string, dateColumn: string, userId: string): Promise<Record<string, unknown>[]> {
  if (!supabase) return []
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order(dateColumn)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data as Record<string, unknown>[]))
    if (data.length < PAGE) return rows
  }
}

export async function readAllWork(userId: string): Promise<WorkEntry[]> {
  const rows = await readAll('work_entries', 'work_date', userId)
  return rows.map((row) => ({
    date: row.work_date as string,
    kind: row.kind as WorkEntry['kind'],
    startMin: row.start_min as number | null,
    endMin: row.end_min as number | null,
    totalMin: row.total_min as number | null,
    breakMin: row.break_min as number,
    note: row.note as string,
  }))
}

export async function readAllTx(userId: string): Promise<Tx[]> {
  const rows = await readAll('transactions', 'tx_date', userId)
  return rows.map((row) => ({
    id: row.id as string,
    date: row.tx_date as string,
    kind: row.kind as Tx['kind'],
    cents: row.amount_cents as number,
    category: row.category as string,
    note: row.note as string,
    fixedId: row.fixed_id as string | null,
  }))
}
