export const CHART_TIME_ZONE = 'Asia/Kolkata'
const NY_TIME_ZONE = 'America/New_York'

export function chartDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CHART_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function isWeekday(key) {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay()
  return day >= 1 && day <= 5
}

export function moveTradingDay(key, direction) {
  const date = new Date(`${key}T12:00:00Z`)
  do { date.setUTCDate(date.getUTCDate() + direction) } while (!isWeekday(date.toISOString().slice(0, 10)))
  return date.toISOString().slice(0, 10)
}

export function latestTradingDay(date = new Date()) {
  let key = chartDateKey(date)
  while (!isWeekday(key)) key = moveTradingDay(key, -1)
  return key
}

function nyOffset(dateKey) {
  const atNoonIst = new Date(`${dateKey}T12:00:00+05:30`)
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: NY_TIME_ZONE, timeZoneName: 'shortOffset' }).formatToParts(atNoonIst).find((part) => part.type === 'timeZoneName')?.value
  return Number(offset?.match(/GMT([+-]\d+)/)?.[1] ?? -5)
}

export function formatMinutes(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

export function candleSlots(timeframe, dateKey) {
  const starts = timeframe === '1H'
    ? Array.from({ length: 24 }, (_, index) => 30 + index * 60)
    : Array.from({ length: 6 }, (_, index) => (nyOffset(dateKey) === -4 ? 150 : 210) + index * 240)
  const duration = timeframe === '1H' ? 60 : 240
  const istMidnight = new Date(`${dateKey}T00:00:00+05:30`).getTime()
  return starts.filter((start) => timeframe === '4H' || isGoldMarketOpen(new Date(istMidnight + (start + 30) * 60000))).map((start) => ({
    key: `${timeframe}-${formatMinutes(start).replace(':', '')}`,
    label: `${formatMinutes(start)}–${formatMinutes(start + duration)}`,
    start,
    duration,
  }))
}

export function activeCandle(timeframe, dateKey, now = new Date()) {
  if (chartDateKey(now) !== dateKey || !isWeekday(dateKey)) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: CHART_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const minutes = Number(parts.find((part) => part.type === 'hour').value) * 60 + Number(parts.find((part) => part.type === 'minute').value)
  return candleSlots(timeframe, dateKey).find((slot) => minutes >= slot.start && minutes < slot.start + slot.duration) ?? null
}

export function isGoldMarketOpen(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: NY_TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(({ type, value }) => [type, value]))
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  if (parts.weekday === 'Sat') return false
  if (parts.weekday === 'Sun') return minutes >= 18 * 60 + 5
  if (parts.weekday === 'Fri' && minutes >= 17 * 60) return false
  return minutes < 16 * 60 + 59 || minutes >= 18 * 60 + 5
}
