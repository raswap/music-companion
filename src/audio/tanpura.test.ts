import { describe, expect, it } from 'vitest'
import { nearestSample, playbackRateFor, shiftSemitones } from './tanpura'

describe('playbackRateFor', () => {
  it('is 1 when the sample already matches', () => {
    expect(playbackRateFor(138.8, 138.8)).toBe(1)
  })

  it('shifts within six semitones directly', () => {
    expect(playbackRateFor(146.83, 138.8)).toBeCloseTo(146.83 / 138.8, 9)
    expect(playbackRateFor(130.81, 138.8)).toBeCloseTo(130.81 / 138.8, 9)
  })

  it('folds a large upward shift down an octave', () => {
    // Female Sa at A3 against a C#3 sample: +8 semitones becomes -4.
    const rate = playbackRateFor(220, 138.8)
    expect(rate).toBeLessThan(1)
    expect(rate).toBeCloseTo(110 / 138.8, 9)
    expect(shiftSemitones(220, 138.8)).toBeCloseTo(4.03, 1)
  })

  it('folds a large downward shift up an octave', () => {
    expect(playbackRateFor(70, 138.8)).toBeCloseTo(140 / 138.8, 9)
  })

  it('always lands within [1/sqrt2, sqrt2]', () => {
    for (let hz = 60; hz < 500; hz += 7) {
      const r = playbackRateFor(hz, 155.4)
      expect(r).toBeGreaterThanOrEqual(1 / Math.SQRT2 - 1e-12)
      expect(r).toBeLessThanOrEqual(Math.SQRT2 + 1e-12)
    }
  })
})

describe('nearestSample', () => {
  const samples = [
    { url: 'cs', saHz: 138.8 },
    { url: 'ds', saHz: 155.4 },
    { url: 'e', saHz: 161.9 },
  ]

  it('returns undefined for an empty list', () => {
    expect(nearestSample([], 140)).toBeUndefined()
  })

  it('prefers the sample with the smallest folded shift', () => {
    expect(nearestSample(samples, 138.6)?.url).toBe('cs')
    expect(nearestSample(samples, 164.8)?.url).toBe('e')
    // G#3 (207.65 Hz): E3 up 4.3 semitones beats C#3 folded down 5.0.
    expect(nearestSample(samples, 207.65)?.url).toBe('e')
    // A3 (220): folded 110 Hz; C#3 is 4.0 semitones away, D#3 is 6.0, E3 6.7.
    expect(nearestSample(samples, 220)?.url).toBe('cs')
  })
})
