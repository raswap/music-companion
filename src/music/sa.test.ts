import { describe, expect, it } from 'vitest'
import { DEFAULT_SA, formatSa, hzToSa, saToHz } from './sa'

describe('saToHz', () => {
  it('returns 440 for A4', () => {
    expect(saToHz({ note: 'A', octave: 4, fineCents: 0 })).toBeCloseTo(440, 9)
  })

  it('returns middle C for C4', () => {
    expect(saToHz({ note: 'C', octave: 4, fineCents: 0 })).toBeCloseTo(261.626, 2)
  })

  it('applies fine tuning in cents', () => {
    const base = saToHz({ note: 'D', octave: 3, fineCents: 0 })
    const up = saToHz({ note: 'D', octave: 3, fineCents: 50 })
    expect(1200 * Math.log2(up / base)).toBeCloseTo(50, 6)
  })

  it('default Sa is a plausible male tonic around C#3', () => {
    expect(saToHz(DEFAULT_SA)).toBeCloseTo(138.59, 1)
  })
})

describe('hzToSa', () => {
  it('round-trips a tuned note', () => {
    const sa = { note: 'G#', octave: 3, fineCents: 0 } as const
    expect(hzToSa(saToHz(sa))).toEqual(sa)
  })

  it('captures fine tuning offsets', () => {
    const hz = saToHz({ note: 'E', octave: 3, fineCents: -23 })
    expect(hzToSa(hz)).toEqual({ note: 'E', octave: 3, fineCents: -23 })
  })

  it('handles octave boundaries around B/C', () => {
    expect(hzToSa(saToHz({ note: 'B', octave: 2, fineCents: 0 }))).toEqual({ note: 'B', octave: 2, fineCents: 0 })
    expect(hzToSa(saToHz({ note: 'C', octave: 3, fineCents: 0 }))).toEqual({ note: 'C', octave: 3, fineCents: 0 })
  })
})

describe('formatSa', () => {
  it('formats with and without fine tuning', () => {
    expect(formatSa({ note: 'C#', octave: 3, fineCents: 0 })).toBe('C#3')
    expect(formatSa({ note: 'D', octave: 3, fineCents: 12 })).toBe('D3 +12¢')
    expect(formatSa({ note: 'D', octave: 3, fineCents: -7 })).toBe('D3 -7¢')
  })
})
