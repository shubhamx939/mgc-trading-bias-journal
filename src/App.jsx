import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Activity, ArrowRight, ArrowUpRight, Bell, BellOff, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download, History, LayoutDashboard, Menu, Target, Trash2, Volume2, VolumeX, X } from 'lucide-react'
import { useJournal } from './hooks/useJournal'
import { allEntries, BIASES, eraseLocalData, exportCsv, hasEntries, HTF, htfEntries, ltfEntries, REVIEW_PREFIX, scoreEntries, SOUND_KEY } from './lib/journal'
import { activeCandle, candleSlots, chartDateKey, isGoldMarketOpen, isWeekday, latestTradingDay, moveTradingDay } from './lib/schedule'
import { notifyCandle, playChime } from './lib/alerts'
import './index.css'

const BIAS_LABELS = { bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral' }
const BIAS_SYMBOLS = { bullish: '↗', bearish: '↘', neutral: '—' }
const AccuracyChart = lazy(() => import('./components/AccuracyChart'))
const NAV = [
  { id: 'journal', label: 'Current Day Journal', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'Historical Logs', icon: History },
]

function formatDate(key, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${key}T12:00:00`))
}

function BiasButtons({ value, onChange, compact = false, label }) {
  return <div className={`bias-buttons ${compact ? 'compact' : ''}`} role="group" aria-label={label}>
    {BIASES.map((bias) => <button key={bias} type="button" className={`bias-button ${bias} ${value === bias ? 'selected' : ''}`} aria-pressed={value === bias} onClick={() => onChange(value === bias ? null : bias)} title={BIAS_LABELS[bias]}>
      <span className="bias-symbol">{BIAS_SYMBOLS[bias]}</span><span className="bias-word">{BIAS_LABELS[bias]}</span>
    </button>)}
  </div>
}

function BiasPill({ value }) {
  return value ? <span className={`bias-pill ${value}`}>{BIAS_SYMBOLS[value]} {BIAS_LABELS[value]}</span> : <span className="muted">Not logged</span>
}

function ScoreText({ score }) {
  return score.total ? <span>{score.correct}/{score.total} correct <span className="score-divider">·</span> {score.percent}%</span> : <span>Awaiting results</span>
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return <div className="metric-card">
    <div className="metric-head"><span>{label}</span><Icon size={18} className={tone || 'icon-muted'} /></div>
    <div className="metric-value">{value}</div><div className="metric-detail">{detail}</div>
  </div>
}

function ReviewModal({ date, day, onClose }) {
  const entries = htfEntries(day)
  const score = scoreEntries(entries)
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button className="icon-button modal-close" onClick={onClose} aria-label="Close review"><X size={19} /></button>
      <div className="eyebrow"><span className="eyebrow-line" /> PREVIOUS DAY REVIEW</div>
      <h2 id="review-title">How did you read the market?</h2>
      <p className="modal-subtitle">{formatDate(date)} · Morning forecast versus end-of-day behavior</p>
      <div className="review-score"><span className="review-score-number">{score.total ? `${score.correct}/${score.total}` : '—'}</span><div><strong>Timeframes correct</strong><small>{score.total ? `${score.percent}% accuracy across completed pairs` : 'Log EOD behavior to calculate accuracy'}</small></div></div>
      <div className="review-table">
        <div className="review-row review-labels"><span>TIMEFRAME</span><span>ANTICIPATED</span><span>ACTUAL</span><span>RESULT</span></div>
        {entries.map((entry) => <div className="review-row" key={entry.timeframe}><strong>{entry.timeframe}</strong><BiasPill value={entry.bias} /><BiasPill value={entry.actual} /><span className={`result-icon ${entry.bias && entry.actual ? entry.bias === entry.actual ? 'right' : 'wrong' : ''}`}>{entry.bias && entry.actual ? entry.bias === entry.actual ? <Check size={16} /> : <X size={16} /> : '—'}</span></div>)}
      </div>
      <button className="primary-button full" onClick={onClose}>Start today’s journal <ArrowRight size={17} /></button>
    </section>
  </div>
}

function EraseModal({ onClose, onErase, onExport, error }) {
  const [confirmation, setConfirmation] = useState('')
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="review-modal erase-modal" role="dialog" aria-modal="true" aria-labelledby="erase-title">
      <button className="icon-button modal-close" onClick={onClose} aria-label="Close erase dialog"><X size={19} /></button>
      <div className="erase-icon"><Trash2 size={22} /></div>
      <h2 id="erase-title">Erase all journal data?</h2>
      <p className="modal-subtitle">This permanently removes your HTF and intraday entries, review history, and sound setting from this browser. It cannot be undone.</p>
      <button type="button" className="backup-link" onClick={onExport}><Download size={15} /> Download a CSV backup first</button>
      <form onSubmit={(event) => { event.preventDefault(); if (confirmation === 'ERASE') onErase() }}>
        <label className="erase-label" htmlFor="erase-confirmation">Type <strong>ERASE</strong> to confirm</label>
        <input id="erase-confirmation" className="erase-input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} />
        {error && <p className="erase-error" role="alert">{error}</p>}
        <div className="erase-actions"><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="danger-button" disabled={confirmation !== 'ERASE'}><Trash2 size={15} /> Erase data</button></div>
      </form>
    </section>
  </div>
}

function JournalView({ date, setDate, today, day, dispatch, now }) {
  const [ltfTab, setLtfTab] = useState('1H')
  const timelineListRef = useRef(null)
  const htfScore = scoreEntries(htfEntries(day))
  const ltfScore = scoreEntries(ltfEntries(day))
  const tabScore = scoreEntries(ltfEntries(day).filter((entry) => entry.timeframe === ltfTab))
  const loggedMorning = htfEntries(day).filter((entry) => entry.bias).length
  const loggedEod = htfEntries(day).filter((entry) => entry.actual).length
  const currentSlot = date === today && isGoldMarketOpen(now) ? activeCandle(ltfTab, date, now) : null
  const scheduled = candleSlots(ltfTab, date)
  const slots = ltfTab === '1H' && currentSlot ? [currentSlot, ...scheduled.filter((slot) => slot.key !== currentSlot.key)] : scheduled
  useEffect(() => { if (timelineListRef.current) timelineListRef.current.scrollTop = 0 }, [ltfTab, date, currentSlot?.key])

  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> DAILY WORKSPACE</div><h1>Trading Bias Journal<span className="gold-dot">.</span></h1><p>Build your read. Track what actually happened. Get sharper every day.</p></div><div className="date-control"><button className="icon-button" aria-label="Previous day" onClick={() => { setDate(moveTradingDay(date, -1)) }}><ChevronLeft size={18} /></button><div><CalendarDays size={16} /><span>{formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div><button className="icon-button" aria-label="Next day" disabled={date >= today} onClick={() => { setDate(moveTradingDay(date, 1)) }}><ChevronRight size={18} /></button></div></div>

    <div className="intro-banner"><div className="intro-icon"><Activity size={24} /></div><div><div className="intro-kicker">MGC · MICRO GOLD FUTURES</div><h2>{date === today ? 'Your edge starts with a clear bias.' : `Journal review · ${formatDate(date, { month: 'long', day: 'numeric' })}`}</h2><p>Make a call before the candle moves. Record the result after it closes.</p></div><div className="banner-mark">Au<span>79</span></div></div>

    <div className="metrics-grid"><MetricCard icon={Target} label="HTF ACCURACY" value={htfScore.percent === null ? '—' : `${htfScore.percent}%`} detail={<ScoreText score={htfScore} />} tone="icon-gold" /><MetricCard icon={Activity} label="INTRADAY ACCURACY" value={ltfScore.percent === null ? '—' : `${ltfScore.percent}%`} detail={<ScoreText score={ltfScore} />} tone="icon-green" /><MetricCard icon={ArrowUpRight} label="MORNING BIAS" value={`${loggedMorning}/6`} detail="Higher timeframes logged" tone="icon-blue" /><MetricCard icon={Check} label="EOD REVIEW" value={`${loggedEod}/6`} detail="Actual behavior logged" tone="icon-purple" /></div>

    <div className="journal-panels"><section className="panel"><div className="section-head"><div><div className="section-kicker">01 / BIG PICTURE</div><h2>Higher timeframes</h2><p>Set your morning expectation, then mark what the market did by EOD.</p></div><span className="section-badge">6 TIMEFRAMES</span></div>
      <div className="htf-table-wrap"><div className="htf-table"><div className="htf-row htf-labels"><span>TIMEFRAME</span><span>MORNING BIAS <small>YOUR ANTICIPATION</small></span><span>END OF DAY <small>MARKET REALITY</small></span><span>OUTCOME</span></div>{HTF.map((timeframe) => { const row = day.htf?.[timeframe] || {}; const outcome = row.morning && row.actual ? row.morning === row.actual : null; return <div className="htf-row" key={timeframe}><div className="timeframe-cell"><span className="tf-icon">{timeframe}</span><div><strong>{timeframe}</strong><small>{({ '12M': 'Yearly', '6M': 'Half-year', '3M': 'Quarterly', '1M': 'Monthly', '1W': 'Weekly', '1D': 'Daily' })[timeframe]}</small></div></div><BiasButtons compact label={`${timeframe} morning bias`} value={row.morning} onChange={(bias) => dispatch({ type: 'SET_HTF', date, timeframe, phase: 'morning', bias })} /><BiasButtons compact label={`${timeframe} end of day result`} value={row.actual} onChange={(bias) => dispatch({ type: 'SET_HTF', date, timeframe, phase: 'actual', bias })} /><div className={`outcome ${outcome === true ? 'correct' : outcome === false ? 'incorrect' : ''}`}>{outcome === true ? <><Check size={16} /> Correct</> : outcome === false ? <><X size={16} /> Missed</> : <span>Pending</span>}</div></div> })}</div></div>
    </section>

    <section className="panel intraday-panel"><div className="section-head"><div><div className="section-kicker">02 / THE EXECUTION LENS</div><h2>Intraday timeline</h2><p>OANDA:XAUUSD candles · TradingView chart time: IST</p></div><div className="segmented"><button className={ltfTab === '1H' ? 'active' : ''} onClick={() => setLtfTab('1H')}>1H</button><button className={ltfTab === '4H' ? 'active' : ''} onClick={() => setLtfTab('4H')}>4H</button></div></div>
      <div className="timeline-summary"><div><Clock3 size={17} /><span>{ltfTab === '1H' ? 'Hourly' : 'Four-hour'} candle log</span></div><span><ScoreText score={tabScore} /></span></div>
      <div className="timeline-list" ref={timelineListRef}>{slots.map((slot) => { const entry = day.ltf?.[slot.key] || {}; const outcome = entry.bias && entry.actual ? entry.bias === entry.actual : null; return <div className={`timeline-row ${currentSlot?.key === slot.key ? 'current' : ''}`} key={slot.key}><div className="timeline-time"><span className="timeline-node" /><strong>{slot.label}</strong>{currentSlot?.key === slot.key && <small>LIVE</small>}</div><div className="timeline-input"><span className="field-label">MY BIAS</span><BiasButtons compact label={`${ltfTab} ${slot.label} anticipated bias`} value={entry.bias} onChange={(bias) => dispatch({ type: 'SET_LTF', date, timeframe: ltfTab, slot, phase: 'bias', bias })} /></div><div className="timeline-input"><span className="field-label">ACTUAL CLOSE</span><BiasButtons compact label={`${ltfTab} ${slot.label} actual result`} value={entry.actual} onChange={(bias) => dispatch({ type: 'SET_LTF', date, timeframe: ltfTab, slot, phase: 'actual', bias })} /></div><div className={`timeline-result ${outcome === true ? 'correct' : outcome === false ? 'incorrect' : ''}`}>{outcome === true ? <><Check size={15} /> Hit</> : outcome === false ? <><X size={15} /> Miss</> : '—'}</div></div> })}</div>
    </section></div>
  </div>
}

function AnalyticsView({ journal }) {
  const entries = allEntries(journal)
  const completed = entries.filter((entry) => entry.bias && entry.actual)
  const overall = scoreEntries(completed)
  const days = Object.keys(journal).filter((date) => hasEntries(journal[date])).sort()
  const chart = days.map((date) => ({ date, label: formatDate(date, { month: 'short', day: 'numeric' }), ...scoreEntries(entries.filter((entry) => entry.date === date)) })).filter((item) => item.total)
  const breakdown = [...HTF, '4H', '1H'].map((timeframe) => ({ timeframe, ...scoreEntries(entries.filter((entry) => entry.timeframe === timeframe)) }))
  const best = breakdown.filter((item) => item.total).sort((a, b) => b.percent - a.percent)[0]
  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PERFORMANCE INTELLIGENCE</div><h1>Analytics Dashboard<span className="gold-dot">.</span></h1><p>See where your market read is strong and where it needs work.</p></div><span className="header-tag">ALL-TIME DATA</span></div><div className="metrics-grid"><MetricCard icon={Target} label="OVERALL ACCURACY" value={overall.percent === null ? '—' : `${overall.percent}%`} detail={<ScoreText score={overall} />} tone="icon-gold" /><MetricCard icon={Check} label="CORRECT CALLS" value={overall.correct} detail="Matched market behavior" tone="icon-green" /><MetricCard icon={CalendarDays} label="DAYS JOURNALED" value={days.length} detail="With at least one entry" tone="icon-blue" /><MetricCard icon={ArrowUpRight} label="STRONGEST CHART" value={best?.timeframe || '—'} detail={best ? `${best.percent}% accurate · ${best.total} calls` : 'Awaiting completed calls'} tone="icon-purple" /></div>
    <div className="analytics-panels"><section className="panel chart-panel"><div className="section-head"><div><div className="section-kicker">01 / PROGRESS OVER TIME</div><h2>Bias accuracy by day</h2><p>Completed morning and intraday calls combined.</p></div><span className="section-badge">{chart.length} DATA POINTS</span></div>{chart.length ? <div className="chart-wrap"><Suspense fallback={<div className="empty-chart">Loading chart…</div>}><AccuracyChart data={chart} /></Suspense></div> : <div className="empty-chart"><Activity size={28} /><strong>Your accuracy chart starts here</strong><span>Complete a bias and actual result to see your first data point.</span></div>}</section>
    <section className="panel"><div className="section-head"><div><div className="section-kicker">02 / TIMEFRAME EDGE</div><h2>Accuracy by timeframe</h2><p>Find the charts you read most consistently.</p></div></div><div className="breakdown-grid">{breakdown.map((item) => <div className="breakdown-row" key={item.timeframe}><div className="breakdown-top"><strong>{item.timeframe}</strong><span>{item.total ? `${item.percent}%` : '—'}</span></div><div className="progress-track"><div style={{ width: `${item.percent || 0}%` }} /></div><small>{item.total ? `${item.correct} correct of ${item.total} completed` : 'No completed calls yet'}</small></div>)}</div></section></div>
  </div>
}

function HistoryView({ journal, onOpen, onExport, onErase }) {
  const dates = Object.keys(journal).filter((date) => hasEntries(journal[date])).sort().reverse()
  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR TRACK RECORD</div><h1>Historical Logs<span className="gold-dot">.</span></h1><p>Revisit each session and see how your read evolved.</p></div><div className="history-actions"><button className="outline-button" onClick={onExport}><Download size={16} /> Export CSV</button><button className="outline-button danger-outline" onClick={onErase}><Trash2 size={16} /> Erase data</button></div></div><section className="panel"><div className="section-head"><div><div className="section-kicker">JOURNAL ARCHIVE</div><h2>All sessions</h2><p>{dates.length} {dates.length === 1 ? 'day' : 'days'} recorded in this browser</p></div></div>{dates.length ? <div className="history-list">{dates.map((date) => { const day = journal[date]; const score = scoreEntries([...htfEntries(day), ...ltfEntries(day)]); const htfCount = htfEntries(day).filter((entry) => entry.bias || entry.actual).length; const ltfCount = ltfEntries(day).length; return <button className="history-row" key={date} onClick={() => onOpen(date)}><span className="history-calendar"><CalendarDays size={19} /></span><span className="history-main"><strong>{formatDate(date)}</strong><small>{htfCount} HTF entries · {ltfCount} intraday candles</small></span><span className={`history-accuracy ${score.percent === null ? 'no-score' : ''}`}>{score.percent === null ? 'No score' : `${score.percent}% accuracy`}</span><ChevronRight size={18} className="history-chevron" /></button> })}</div> : <div className="empty-chart"><History size={28} /><strong>No sessions yet</strong><span>Your logged days will appear here automatically.</span></div>}</section></div>
}

export default function App() {
  const { journal, dispatch, saveError } = useJournal()
  const [now, setNow] = useState(() => new Date())
  const today = latestTradingDay(now)
  const [date, setDate] = useState(today)
  const lastToday = useRef(today)
  const [view, setView] = useState('journal')
  const [menuOpen, setMenuOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_KEY) === 'true')
  const [alertsEnabled, setAlertsEnabled] = useState(() => 'Notification' in window && Notification.permission === 'granted')
  const [alertBanner, setAlertBanner] = useState('')
  const [dismissedReview, setDismissedReview] = useState(null)
  const [eraseOpen, setEraseOpen] = useState(false)
  const [eraseError, setEraseError] = useState('')
  const lastHour = useRef(isGoldMarketOpen(now) ? `${chartDateKey(now)}-${activeCandle('1H', chartDateKey(now), now)?.key}` : '')
  const lastMarketOpen = useRef(isGoldMarketOpen(now))
  const previous = moveTradingDay(today, -1)
  const reviewDate = isWeekday(chartDateKey(now)) && journal[previous] && htfEntries(journal[previous]).some((entry) => entry.bias || entry.actual) && dismissedReview !== previous && !localStorage.getItem(`${REVIEW_PREFIX}${today}`) ? previous : null

  useEffect(() => {
    if (today !== lastToday.current) {
      if (date === lastToday.current) setDate(today)
      lastToday.current = today
    }
  }, [today, date])
  useEffect(() => { if (soundEnabled) localStorage.setItem(SOUND_KEY, 'true'); else localStorage.removeItem(SOUND_KEY) }, [soundEnabled])
  useEffect(() => {
    const tick = () => {
      const current = new Date()
      setNow(current)
      const candle = activeCandle('1H', chartDateKey(current), current)
      const hourToken = candle ? `${chartDateKey(current)}-${candle.key}` : ''
      const marketOpen = isGoldMarketOpen(current)
      const reopened = marketOpen && !lastMarketOpen.current
      lastMarketOpen.current = marketOpen
      if (marketOpen && candle && hourToken !== lastHour.current) {
        lastHour.current = hourToken
        const elapsed = current.getTime() - new Date(current).setMinutes(30, 0, 0)
        if (reopened || (elapsed >= 0 && elapsed < 5 * 60000)) {
          const isFourHour = reopened || activeCandle('4H', chartDateKey(current), current)?.start === candle.start
          const label = isFourHour ? '1H and 4H' : '1H'
          setAlertBanner(`New ${label} candle started. Log your MGC bias.`)
          notifyCandle(label, soundEnabled)
        }
      }
    }
    const timer = window.setInterval(tick, 10000)
    return () => window.clearInterval(timer)
  }, [soundEnabled])
  function closeReview() {
    localStorage.setItem(`${REVIEW_PREFIX}${today}`, 'true')
    setDismissedReview(previous)
  }
  async function enableNotifications() {
    if (!('Notification' in window)) { setAlertBanner('This browser does not support system notifications. In-app reminders still work.'); return }
    const permission = await Notification.requestPermission()
    setAlertsEnabled(permission === 'granted')
    setAlertBanner(permission === 'granted' ? 'Candle notifications enabled.' : 'System notifications are unavailable. In-app reminders remain active.')
  }
  function toggleSound() {
    if (!soundEnabled) playChime()
    setSoundEnabled((value) => !value)
  }
  function downloadCsv() {
    const blob = new Blob(['\uFEFF', exportCsv(journal)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mgc-bias-journal-${today}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  function eraseAllData() {
    try {
      eraseLocalData(localStorage)
    } catch {
      setEraseError('Your browser could not erase the saved data. Check your site storage settings and try again.')
      return
    }
    dispatch({ type: 'RESET' })
    setSoundEnabled(false)
    setDismissedReview(null)
    setEraseOpen(false)
    setEraseError('')
    setDate(today)
    switchView('journal')
    setAlertBanner('Journal data erased from this browser.')
  }
  function switchView(next) { setView(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <div className="app-shell"><aside className={`sidebar ${menuOpen ? 'open' : ''}`}><div className="brand"><div className="brand-mark"><span>Au</span></div><div><strong>AUREUM</strong><small>TRADING JOURNAL</small></div></div><div className="sidebar-group-label">WORKSPACE</div><nav aria-label="Main navigation">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => switchView(id)}><Icon size={18} /><span>{label}</span>{view === id && <span className="nav-indicator" />}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-market"><span className="live-dot" /><div><strong>MGC / MICRO GOLD</strong><small>Personal bias tracker</small></div></div><div className="sidebar-foot">Built for clearer market reads <span>✦</span></div></div></aside>
    <div className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu"><Menu size={20} /></button><div className="breadcrumb"><span>WORKSPACE</span><ChevronRight size={14} /><strong>{NAV.find((item) => item.id === view)?.label}</strong></div><div className="top-actions"><span className="local-time"><Clock3 size={15} /> {new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(now)} LOCAL</span><button className={`icon-button top-action ${soundEnabled ? 'enabled' : ''}`} onClick={toggleSound} title={soundEnabled ? 'Disable chime' : 'Enable chime'} aria-label={soundEnabled ? 'Disable chime' : 'Enable chime'}>{soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className={`icon-button top-action ${alertsEnabled ? 'enabled' : ''}`} onClick={enableNotifications} title="Enable browser notifications" aria-label="Enable browser notifications">{alertsEnabled ? <Bell size={18} /> : <BellOff size={18} />}</button><div className="avatar">MG</div></div></header>
      <main className="content">{saveError && <div className="status-banner error">Your browser could not save the journal. Export your data before closing this tab.</div>}{alertBanner && <div className="status-banner"><Bell size={16} /><span>{alertBanner}</span><button onClick={() => setAlertBanner('')} aria-label="Dismiss alert"><X size={16} /></button></div>}{view === 'journal' ? <JournalView date={date} setDate={setDate} today={today} day={journal[date] || {}} dispatch={dispatch} now={now} /> : view === 'analytics' ? <AnalyticsView journal={journal} /> : <HistoryView journal={journal} onOpen={(selected) => { setDate(selected); switchView('journal') }} onExport={downloadCsv} onErase={() => { setEraseError(''); setEraseOpen(true) }} />}</main>
    </div>{menuOpen && <button className="mobile-overlay" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}{reviewDate && <ReviewModal date={reviewDate} day={journal[reviewDate]} onClose={closeReview} />}{eraseOpen && <EraseModal onClose={() => setEraseOpen(false)} onErase={eraseAllData} onExport={downloadCsv} error={eraseError} />}</div>
}
