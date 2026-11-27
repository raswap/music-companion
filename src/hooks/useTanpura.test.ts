import { describe, expect, it } from 'vitest'
import { AUTO_INSTRUMENT, DEFAULT_TANPURA, TANPURA_SAMPLES, pickSample } from './useTanpura'

describe('pickSample', () => {
  it('defaults to one instrument for every key', () => {
    for (const hz of [98, 123.5, 138.6, 164.8, 207.7, 246.9]) {
      expect(pickSample(hz, DEFAULT_TANPURA.instrument)?.url).toBe(TANPURA_SAMPLES[0].url)
    }
  })

  it('returns the chosen recording when it exists', () => {
    const ds = TANPURA_SAMPLES[1]
    expect(pickSample(138.6, ds.url)).toBe(ds)
  })

  it('falls back to the nearest recording for auto or an unknown url', () => {
    expect(pickSample(164.8, AUTO_INSTRUMENT)?.url).toBe(TANPURA_SAMPLES[2].url)
    expect(pickSample(164.8, '/tanpura/removed.mp3')?.url).toBe(TANPURA_SAMPLES[2].url)
  })
})
