import { describe, expect, it } from 'vitest'
import { activeSpans, createActivityClock, formatDuration, IDLE_MS, MAX_GAP_MS, splitByDay, TICK_MS, timeTotals } from '../learning/time'

const at = (h: number, m = 0, s = 0, day = 2) => new Date(2026, 10, day, h, m, s).getTime()

describe('active time', () => {
  it('splits a span at local midnight', () => {
    expect(splitByDay(at(23, 59, 50), at(0, 0, 5, 3))).toEqual({ '2026-11-02': 10_000, '2026-11-03': 5_000 })
    expect(splitByDay(at(10), at(10))).toEqual({})
  })

  it('stops counting two minutes after the last input', () => {
    expect(activeSpans(at(10, 1, 50), at(10, 2, 5), at(10))).toEqual({ '2026-11-02': 10_000 })
    expect(activeSpans(at(10, 3), at(10, 3, 15), at(10))).toEqual({})
  })

  it('never counts more than one gap per tick (a laptop waking from sleep)', () => {
    expect(activeSpans(at(10), at(11), at(10))).toEqual({ '2026-11-02': MAX_GAP_MS })
  })

  it('counts ticks while active and nothing while hidden', () => {
    const clock = createActivityClock(at(10), true)
    for (let t = at(10) + TICK_MS; t <= at(10, 1); t += TICK_MS) {
      clock.input(t - 1000, true)
      clock.update(t, true)
    }
    clock.update(at(10, 1, 15), false) // hidden from here
    clock.update(at(10, 5), false)
    expect(clock.take()).toEqual({ '2026-11-02': 75_000 })
    expect(clock.take()).toEqual({})
  })

  it('restarts from the first input after an idle stretch', () => {
    const clock = createActivityClock(at(10), true)
    for (let t = at(10) + TICK_MS; t <= at(10, 10); t += TICK_MS) clock.update(t, true)
    expect(clock.take()).toEqual({ '2026-11-02': IDLE_MS })
    clock.input(at(10, 10, 5), true)
    clock.update(at(10, 10, 15), true)
    expect(clock.take()).toEqual({ '2026-11-02': 10_000 })
  })

  it('starts counting on input when it was inactive', () => {
    const clock = createActivityClock(at(10), false)
    clock.update(at(10, 0, 15), false)
    clock.input(at(10, 0, 20), true)
    clock.update(at(10, 0, 30), true)
    expect(clock.take()).toEqual({ '2026-11-02': 10_000 })
  })

  it('totals today, the last seven days and all time', () => {
    const daily = {
      '2026-11-02': { activeMs: 60_000 },
      '2026-10-27': { activeMs: 120_000 },
      '2026-10-26': { activeMs: 600_000 },
      '2026-10-25': {},
    }
    expect(timeTotals(daily, at(12))).toEqual({ today: 60_000, week: 180_000, total: 780_000 })
  })

  it('formats minutes and hours', () => {
    expect(formatDuration(59_999)).toBe('0 min')
    expect(formatDuration(25 * 60_000)).toBe('25 min')
    expect(formatDuration(60 * 60_000)).toBe('1 h')
    expect(formatDuration(65 * 60_000 + 30_000)).toBe('1 h 5 min')
  })
})
