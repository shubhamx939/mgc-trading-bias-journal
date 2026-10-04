import test from 'node:test'
import assert from 'node:assert/strict'
import { exportCsv, htfEntries, journalReducer, ltfEntries, scoreEntries, slotKey } from './journal.js'

test('morning and EOD choices remain separate and score completed pairs only', () => {
  let journal = {}
  journal = journalReducer(journal, { type: 'SET_HTF', date: '2026-10-04', timeframe: '1D', phase: 'morning', bias: 'neutral' })
  assert.deepEqual(scoreEntries(htfEntries(journal['2026-10-04'])), { correct: 0, total: 0, percent: null })
  journal = journalReducer(journal, { type: 'SET_HTF', date: '2026-10-04', timeframe: '1D', phase: 'actual', bias: 'neutral' })
  assert.deepEqual(scoreEntries(htfEntries(journal['2026-10-04'])), { correct: 1, total: 1, percent: 100 })
  journal = journalReducer(journal, { type: 'SET_HTF', date: '2026-10-04', timeframe: '1D', phase: 'morning', bias: null })
  assert.deepEqual(scoreEntries(htfEntries(journal['2026-10-04'])), { correct: 0, total: 0, percent: null })
  journal = journalReducer(journal, { type: 'SET_HTF', date: '2026-10-04', timeframe: '1D', phase: 'actual', bias: null })
  assert.equal(journal['2026-10-04'], undefined)
})

test('4H choices update one candle without overwriting hourly or another day', () => {
  let journal = {}
  journal = journalReducer(journal, { type: 'SET_LTF', date: '2026-10-04', timeframe: '4H', hour: 5, phase: 'bias', bias: 'bullish' })
  journal = journalReducer(journal, { type: 'SET_LTF', date: '2026-10-04', timeframe: '4H', hour: 7, phase: 'actual', bias: 'bearish' })
  journal = journalReducer(journal, { type: 'SET_LTF', date: '2026-10-04', timeframe: '1H', hour: 5, phase: 'bias', bias: 'neutral' })
  journal = journalReducer(journal, { type: 'SET_LTF', date: '2026-10-05', timeframe: '4H', hour: 5, phase: 'bias', bias: 'bearish' })
  assert.equal(slotKey('4H', 7), '4H-04')
  assert.equal(journal['2026-10-04'].ltf['4H-04'].bias, 'bullish')
  assert.equal(journal['2026-10-04'].ltf['4H-04'].actual, 'bearish')
  assert.equal(journal['2026-10-04'].ltf['1H-05'].bias, 'neutral')
  assert.equal(journal['2026-10-05'].ltf['4H-04'].bias, 'bearish')
  assert.deepEqual(scoreEntries(ltfEntries(journal['2026-10-04'])), { correct: 0, total: 1, percent: 0 })
})

test('CSV export includes completed and pending entries with explicit candle times', () => {
  const journal = { '2026-10-04': { htf: { '1D': { morning: 'bullish', actual: 'bullish' } }, ltf: { '1H-09': { timeframe: '1H', hour: 9, bias: 'bearish' } } } }
  const csv = exportCsv(journal)
  assert.match(csv, /"2026-10-04","HTF","1D","","bullish","bullish","true"/)
  assert.match(csv, /"2026-10-04","LTF","1H","09:00","bearish","",""/)
})
