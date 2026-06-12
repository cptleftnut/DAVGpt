import { describe, it, expect } from 'vitest'
import { scheduleIntervalMs } from './ground'

describe('scheduleIntervalMs', () => {
  it('returns 0 for "once"', () => {
    expect(scheduleIntervalMs('once')).toBe(0)
  })

  it('returns 60,000 for "every60s"', () => {
    expect(scheduleIntervalMs('every60s')).toBe(60_000)
  })

  it('returns 300,000 for "every5m"', () => {
    expect(scheduleIntervalMs('every5m')).toBe(300_000)
  })

  it('returns 3,600,000 for "hourly"', () => {
    expect(scheduleIntervalMs('hourly')).toBe(3_600_000)
  })

  it('returns 86,400,000 for "daily"', () => {
    expect(scheduleIntervalMs('daily')).toBe(86_400_000)
  })
})
