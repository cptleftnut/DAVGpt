import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getDueGroundTasks, saveGroundTasks, GroundTask } from './ground'

describe('getDueGroundTasks', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return empty array when no tasks exist', () => {
    expect(getDueGroundTasks()).toEqual([])
  })

  it('should return only enabled tasks', () => {
    const now = 10000
    vi.setSystemTime(now)

    const tasks: GroundTask[] = [
      { id: '1', name: 'Task 1', command: 'cmd1', schedule: 'once', nextRun: now - 1000, enabled: true, createdAt: now - 2000 },
      { id: '2', name: 'Task 2', command: 'cmd2', schedule: 'once', nextRun: now - 1000, enabled: false, createdAt: now - 2000 },
    ]

    saveGroundTasks(tasks)

    const dueTasks = getDueGroundTasks()
    expect(dueTasks).toHaveLength(1)
    expect(dueTasks[0].id).toBe('1')
  })

  it('should return tasks whose nextRun is in the past', () => {
    const now = 10000
    vi.setSystemTime(now)

    const tasks: GroundTask[] = [
      { id: '1', name: 'Task 1', command: 'cmd1', schedule: 'once', nextRun: now - 1000, enabled: true, createdAt: now - 2000 },
    ]

    saveGroundTasks(tasks)

    const dueTasks = getDueGroundTasks()
    expect(dueTasks).toHaveLength(1)
    expect(dueTasks[0].id).toBe('1')
  })

  it('should return tasks whose nextRun is exactly now', () => {
    const now = 10000
    vi.setSystemTime(now)

    const tasks: GroundTask[] = [
      { id: '1', name: 'Task 1', command: 'cmd1', schedule: 'once', nextRun: now, enabled: true, createdAt: now - 2000 },
    ]

    saveGroundTasks(tasks)

    const dueTasks = getDueGroundTasks()
    expect(dueTasks).toHaveLength(1)
    expect(dueTasks[0].id).toBe('1')
  })

  it('should filter out disabled tasks', () => {
    const now = 10000
    vi.setSystemTime(now)

    const tasks: GroundTask[] = [
      { id: '1', name: 'Task 1', command: 'cmd1', schedule: 'once', nextRun: now - 1000, enabled: false, createdAt: now - 2000 },
    ]

    saveGroundTasks(tasks)

    const dueTasks = getDueGroundTasks()
    expect(dueTasks).toHaveLength(0)
  })

  it('should filter out tasks whose nextRun is in the future', () => {
    const now = 10000
    vi.setSystemTime(now)

    const tasks: GroundTask[] = [
      { id: '1', name: 'Task 1', command: 'cmd1', schedule: 'once', nextRun: now + 1000, enabled: true, createdAt: now - 2000 },
    ]

    saveGroundTasks(tasks)

    const dueTasks = getDueGroundTasks()
    expect(dueTasks).toHaveLength(0)
  })
})
