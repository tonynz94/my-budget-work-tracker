import { useMemo } from 'react'
import { useConfig } from './config'
import { holidayMap } from './holidays'
import type { Holiday } from './holidays'

// The holidays of the given years, with my own changes from Settings.
export function useHolidayMap(years: number[]): ReadonlyMap<string, Holiday> {
  const { config } = useConfig()
  const key = years.join(',')
  return useMemo(
    () => holidayMap(key.split(',').map(Number), config.customHolidays, config.removedHolidays),
    [key, config.customHolidays, config.removedHolidays],
  )
}
