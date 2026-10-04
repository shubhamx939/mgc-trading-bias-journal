export const HTF = ['12M', '6M', '3M', '1M', '1W', '1D']
export const LTF = ['4H', '1H']
export const BIASES = ['bullish', 'bearish', 'neutral']
export const STORAGE_KEY = 'mgc-bias-journal:v1'

export function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function previousDateKey(date = new Date()) {
  const prior = new Date(date)
  prior.setDate(prior.getDate() - 1)
  return dateKey(prior)
}

export function slotHour(timeframe, hour) {
  return timeframe === '4H' ? Math.floor(hour / 4) * 4 : hour
}

export function slotKey(timeframe, hour) {
  return `${timeframe}-${String(slotHour(timeframe, hour)).padStart(2, '0')}`
}

export function slotLabel(timeframe, hour) {
  const start = slotHour(timeframe, hour)
  const end = (start + (timeframe === '4H' ? 4 : 1)) % 24
  return `${String(start).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`
}

export function loadJournal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function commitDay(state, date, day) {
  const htf = Object.fromEntries(Object.entries(day.htf || {}).filter(([, entry]) => entry.morning || entry.actual))
  const ltf = Object.fromEntries(Object.entries(day.ltf || {}).filter(([, entry]) => entry.bias || entry.actual))
  if (!Object.keys(htf).length && !Object.keys(ltf).length) {
    const next = { ...state }
    delete next[date]
    return next
  }
  return { ...state, [date]: { htf, ltf } }
}

export function journalReducer(state, action) {
  if (action.type === 'SET_HTF') {
    const { date, timeframe, phase, bias } = action
    if (!HTF.includes(timeframe) || !['morning', 'actual'].includes(phase) || (bias !== null && !BIASES.includes(bias))) return state
    const day = state[date] || { htf: {}, ltf: {} }
    return commitDay(state, date, { ...day, htf: { ...day.htf, [timeframe]: { ...day.htf?.[timeframe], [phase]: bias } } })
  }
  if (action.type === 'SET_LTF') {
    const { date, timeframe, hour, phase, bias } = action
    if (!LTF.includes(timeframe) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !['bias', 'actual'].includes(phase) || (bias !== null && !BIASES.includes(bias))) return state
    const day = state[date] || { htf: {}, ltf: {} }
    const key = slotKey(timeframe, hour)
    return commitDay(state, date, { ...day, ltf: { ...day.ltf, [key]: { ...day.ltf?.[key], timeframe, hour: slotHour(timeframe, hour), [phase]: bias } } })
  }
  return state
}

export function scoreEntries(entries) {
  const paired = entries.filter(({ bias, actual }) => BIASES.includes(bias) && BIASES.includes(actual))
  const correct = paired.filter(({ bias, actual }) => bias === actual).length
  return { correct, total: paired.length, percent: paired.length ? Math.round((correct / paired.length) * 100) : null }
}

export function htfEntries(day = {}) {
  return HTF.map((timeframe) => ({ timeframe, bias: day.htf?.[timeframe]?.morning, actual: day.htf?.[timeframe]?.actual }))
}

export function ltfEntries(day = {}) {
  return Object.values(day.ltf || {}).filter((entry) => LTF.includes(entry.timeframe) && (entry.bias || entry.actual))
}

export function hasEntries(day = {}) {
  return htfEntries(day).some((entry) => entry.bias || entry.actual) || ltfEntries(day).length > 0
}

export function allEntries(journal) {
  return Object.entries(journal).flatMap(([date, day]) => [
    ...htfEntries(day).map((entry) => ({ date, group: 'HTF', ...entry })),
    ...ltfEntries(day).map((entry) => ({ date, group: 'LTF', ...entry })),
  ])
}

export function exportCsv(journal) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = [['Date', 'Group', 'Timeframe', 'Candle start', 'Anticipated bias', 'Actual', 'Correct']]
  for (const [date, day] of Object.entries(journal).sort(([a], [b]) => a.localeCompare(b))) {
    for (const entry of htfEntries(day)) {
      if (!entry.bias && !entry.actual) continue
      rows.push([date, 'HTF', entry.timeframe, '', entry.bias, entry.actual, entry.bias && entry.actual ? entry.bias === entry.actual : ''])
    }
    for (const entry of ltfEntries(day).sort((a, b) => a.hour - b.hour)) {
      rows.push([date, 'LTF', entry.timeframe, `${String(entry.hour).padStart(2, '0')}:00`, entry.bias, entry.actual, entry.bias && entry.actual ? entry.bias === entry.actual : ''])
    }
  }
  return rows.map((row) => row.map(escape).join(',')).join('\r\n')
}
