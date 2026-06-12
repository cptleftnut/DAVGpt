import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadGroundTasks, saveGroundTasks, GroundTask } from './ground'

describe('ground.ts', () => {
  const GROUND_KEY = 'davgpt_ground_tasks'

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('loadGroundTasks', () => {
    it('returns an empty array when localStorage is empty', () => {
      expect(loadGroundTasks()).toEqual([])
    })

    it('returns parsed tasks when valid JSON exists in localStorage', () => {
      const mockTasks: GroundTask[] = [
        { id: '1', name: 'Task 1', command: 'cmd 1', schedule: 'once', nextRun: 0, enabled: true, createdAt: 0 }
      ]
      localStorage.setItem(GROUND_KEY, JSON.stringify(mockTasks))

      expect(loadGroundTasks()).toEqual(mockTasks)
    })

    it('returns an empty array and handles errors when localStorage contains invalid JSON', () => {
      localStorage.setItem(GROUND_KEY, 'invalid-json')

      expect(loadGroundTasks()).toEqual([])
    })

    it('returns an empty array and handles errors when localStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied')
      })

      expect(loadGroundTasks()).toEqual([])
    })
  })
})
