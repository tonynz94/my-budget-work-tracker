import { formatClock, formatShortDuration } from './format'
import type { LedgerItem } from './ledger'
import { kindLabels, paidMinutes } from './work'
import type { WorkEntry } from './work'

type Cell = string | number

// A cell with a comma, a quote or a new line goes inside quotes.
function escapeCell(cell: Cell): string {
  const text = String(cell)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n'
}

export function workCsv(entries: WorkEntry[]): string {
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => {
      const paid = paidMinutes(entry)
      return [
        entry.date,
        kindLabels[entry.kind],
        entry.startMin !== null ? formatClock(entry.startMin) : '',
        entry.endMin !== null ? formatClock(entry.endMin) : '',
        entry.totalMin !== null ? formatShortDuration(entry.totalMin) : '',
        entry.breakMin,
        paid,
        (paid / 60).toFixed(2),
        entry.note,
      ]
    })
  return toCsv(
    ['Date', 'Type', 'Start', 'End', 'Total entered', 'Unpaid break (min)', 'Paid minutes', 'Paid hours', 'Note'],
    rows,
  )
}

export function budgetCsv(items: LedgerItem[]): string {
  const rows = [...items]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => [
      item.date,
      item.kind === 'income' ? 'Income' : 'Expense',
      (item.cents / 100).toFixed(2),
      item.category,
      item.note,
      item.fixedId ? 'yes' : '',
    ])
  return toCsv(['Date', 'Type', 'Amount', 'Category', 'Note', 'Fixed cost'], rows)
}

// Saves the text as a file. A phone opens the share sheet, so I can save it to Files.
export async function saveCsv(name: string, text: string): Promise<void> {
  // The first character tells Excel that the file is UTF-8.
  const file = new File(['﻿' + text], name, { type: 'text/csv' })
  const onPhone = window.matchMedia('(pointer: coarse)').matches
  if (onPhone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (error) {
      // I closed the share sheet. That is not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
