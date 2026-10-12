const money = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' })

// 123450 cents becomes $1,234.50.
export function formatMoney(cents: number): string {
  return money.format(cents / 100)
}

// A short amount for the calendar. 2350 cents becomes $24 and 123400 cents becomes $1.2k.
export function formatShortMoney(cents: number): string {
  const dollars = cents / 100
  return dollars < 1000 ? `$${Math.round(dollars)}` : `$${(dollars / 1000).toFixed(1)}k`
}

// "25" or "25.5" becomes cents. It returns null if the text is not a valid amount.
export function parseMoney(text: string): number | null {
  const value = Number(text.trim().replace(/[$,]/g, ''))
  if (text.trim() === '' || !Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

// 313 minutes becomes "5h 13m".
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return rest === 0 ? '0h' : `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

// 313 minutes becomes "5:13". This short form is for the calendar.
export function formatShortDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

// 900 minutes from midnight becomes "15:00".
export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function parseClock(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

// A whole number that is 0 or more. Empty text is 0.
export function parseCount(text: string): number | null {
  if (text.trim() === '') return 0
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null
}
