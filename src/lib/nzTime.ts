// All dates in this app use New Zealand time, even if the device is in another time zone.
export const NZ_TIME_ZONE = 'Pacific/Auckland'

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: NZ_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Returns the New Zealand date as YYYY-MM-DD.
export function nzDate(now: Date = new Date()): string {
  return dateFormat.format(now)
}
