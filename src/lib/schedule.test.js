import test from 'node:test'
import assert from 'node:assert/strict'
import { activeCandle, candleSlots, chartDateKey, isGoldMarketOpen, isWeekday, latestTradingDay, moveTradingDay } from './schedule.js'

test('journal navigation skips Saturday and Sunday in IST', () => {
  assert.equal(isWeekday('2026-10-04'), false)
  assert.equal(moveTradingDay('2026-10-02', 1), '2026-10-05')
  assert.equal(moveTradingDay('2026-10-05', -1), '2026-10-02')
  assert.equal(latestTradingDay(new Date('2026-10-04T12:00:00Z')), '2026-10-02')
  assert.equal(chartDateKey(new Date('2026-10-04T20:00:00Z')), '2026-10-05')
})

test('OANDA candle labels track New York daylight saving in IST', () => {
  assert.equal(candleSlots('4H', '2026-10-05')[0].label, '02:30–06:30')
  assert.equal(candleSlots('4H', '2026-11-02')[0].label, '03:30–07:30')
  assert.equal(candleSlots('4H', '2026-10-05').length, 6)
  assert.equal(candleSlots('1H', '2026-10-05')[0].label, '03:30–04:30')
  assert.equal(candleSlots('1H', '2026-10-06')[0].label, '00:30–01:30')
  assert.equal(activeCandle('1H', '2026-10-05', new Date('2026-10-05T07:15:00Z')).label, '12:30–13:30')
})

test('market reminders skip the New York daily break and weekend', () => {
  assert.equal(isGoldMarketOpen(new Date('2026-10-05T06:30:00Z')), true)
  assert.equal(isGoldMarketOpen(new Date('2026-10-05T21:05:00Z')), false)
  assert.equal(isGoldMarketOpen(new Date('2026-10-03T12:00:00Z')), false)
})
