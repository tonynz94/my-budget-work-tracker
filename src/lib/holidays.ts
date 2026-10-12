import { addDays, makeDate, weekday } from './dates'

export type Holiday = {
  date: string
  name: string
  // The original date and the moved date of one holiday share the same group.
  group: string
  observed: boolean
}

export type CustomHoliday = { date: string; name: string }

// Matariki moves every year. These dates are set by the government.
const MATARIKI: Record<number, [number, number]> = {
  2022: [6, 24],
  2023: [7, 14],
  2024: [6, 28],
  2025: [6, 20],
  2026: [7, 10],
  2027: [6, 25],
  2028: [7, 14],
  2029: [7, 6],
  2030: [6, 21],
  2031: [7, 11],
  2032: [7, 2],
  2033: [6, 24],
  2034: [7, 7],
  2035: [6, 29],
}

function easterSunday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return makeDate(year, month, day)
}

function nthMonday(year: number, month: number, n: number): string {
  const first = makeDate(year, month, 1)
  const toMonday = (7 - weekday(first)) % 7
  return addDays(first, toMonday + (n - 1) * 7)
}

// The Monday closest to 29 January.
function aucklandAnniversary(year: number): string {
  const date = makeDate(year, 1, 29)
  const day = weekday(date)
  return day <= 3 ? addDays(date, -day) : addDays(date, 7 - day)
}

export function nzHolidays(year: number): Holiday[] {
  const list: Holiday[] = []
  const add = (date: string, name: string, slug: string) => {
    list.push({ date, name, group: `${year}-${slug}`, observed: false })
  }

  // A holiday on a weekend also gets a weekday. The app shows both dates.
  // A single holiday moves to Monday. Christmas and New Year come in pairs, so they move 2 days.
  const addMovable = (date: string, name: string, slug: string, pair: boolean) => {
    add(date, name, slug)
    const day = weekday(date)
    if (day < 5) return
    const move = pair || day === 5 ? 2 : 1
    list.push({ date: addDays(date, move), name: `${name} (observed)`, group: `${year}-${slug}`, observed: true })
  }

  const easter = easterSunday(year)
  const matariki = MATARIKI[year]

  addMovable(makeDate(year, 1, 1), "New Year's Day", 'new-year', true)
  addMovable(makeDate(year, 1, 2), "Day after New Year's Day", 'new-year-2', true)
  add(aucklandAnniversary(year), 'Auckland Anniversary Day', 'auckland')
  addMovable(makeDate(year, 2, 6), 'Waitangi Day', 'waitangi', false)
  add(addDays(easter, -2), 'Good Friday', 'good-friday')
  add(addDays(easter, 1), 'Easter Monday', 'easter-monday')
  addMovable(makeDate(year, 4, 25), 'ANZAC Day', 'anzac', false)
  add(nthMonday(year, 6, 1), "King's Birthday", 'kings-birthday')
  if (matariki) add(makeDate(year, matariki[0], matariki[1]), 'Matariki', 'matariki')
  add(nthMonday(year, 10, 4), 'Labour Day', 'labour')
  addMovable(makeDate(year, 12, 25), 'Christmas Day', 'christmas', true)
  addMovable(makeDate(year, 12, 26), 'Boxing Day', 'boxing', true)

  return list.sort((a, b) => a.date.localeCompare(b.date))
}

// The holidays for the calendar. It removes the dates I deleted and adds the ones I made.
export function holidayMap(
  years: number[],
  custom: CustomHoliday[],
  removed: string[],
): Map<string, Holiday> {
  const map = new Map<string, Holiday>()
  for (const year of years) {
    for (const holiday of nzHolidays(year)) {
      if (!removed.includes(holiday.date)) map.set(holiday.date, holiday)
    }
  }
  for (const item of custom) {
    map.set(item.date, { date: item.date, name: item.name, group: `custom-${item.date}`, observed: false })
  }
  return map
}
