import { describe, expect, it } from 'vitest'

import { formatFileSize, isValidEmail, nextTicketNumber } from './workspace'

describe('workspace helpers', () => {
  it('numbers tickets one above the highest, even after deletions', () => {
    expect(nextTicketNumber([])).toBe(1)
    expect(nextTicketNumber([{ number: 1 }, { number: 5 }])).toBe(6)
  })

  it('validates emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail(' a@b.co ')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('formats file sizes', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
