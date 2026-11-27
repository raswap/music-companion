import { describe, expect, it } from 'vitest'
import type { TanpuraSample } from '../audio/tanpura'
import { AUTO_INSTRUMENT, DEFAULT_TANPURA, TANPURA_SAMPLES, instrumentOptions, pickSample } from './useTanpura'

const local: TanpuraSample[] = [
  { url: '/l/a2.mp3', saHz: 110, label: 'Set A', set: 'rj', setLabel: 'RJ Sa-Pa', firstString: 'P' },
  { url: '/l/cs3.mp3', saHz: 138.6, label: 'Set C#', set: 'rj', setLabel: 'RJ Sa-Pa', firstString: 'P' },
  { url: '/l/e3.mp3', saHz: 164.8, label: 'Set E', set: 'rj', setLabel: 'RJ Sa-Pa', firstString: 'P' },
  { url: '/l/cs3-ma.mp3', saHz: 138.6, label: 'Set C# Ma', set: 'rjma', setLabel: 'RJ Sa-Ma', firstString: 'm' },
]
const all = [...local, ...TANPURA_SAMPLES]

describe('pickSample', () => {
  it('defaults to one bundled recording for every key', () => {
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

  it('picks the nearest key inside a set, folding octaves', () => {
    expect(pickSample(138.6, 'set:rj', 'P', all)?.url).toBe('/l/cs3.mp3')
    expect(pickSample(220, 'set:rj', 'P', all)?.url).toBe('/l/a2.mp3') // A3 -> A2 an octave down
    expect(pickSample(160, 'set:rj', 'P', all)?.url).toBe('/l/e3.mp3')
  })

  it('prefers recordings whose first string matches, else ignores the string', () => {
    expect(pickSample(138.6, AUTO_INSTRUMENT, 'm', all)?.url).toBe('/l/cs3-ma.mp3')
    expect(pickSample(138.6, AUTO_INSTRUMENT, 'N', all)?.url).toBe('/l/cs3.mp3')
    // A set with no Ma recordings still answers for Ma.
    expect(pickSample(138.6, 'set:rj', 'm', all)?.url).toBe('/l/cs3.mp3')
  })

  it('falls back to any recording when the set is missing', () => {
    expect(pickSample(138.6, 'set:gone', 'P', TANPURA_SAMPLES)?.url).toBe(TANPURA_SAMPLES[0].url)
  })
})

describe('instrumentOptions', () => {
  it('lists sets first, then single recordings, then auto', () => {
    const opts = instrumentOptions(all)
    expect(opts[0]).toEqual({ value: 'set:rj', label: 'RJ Sa-Pa (3 keys)' })
    expect(opts[1]).toEqual({ value: 'set:rjma', label: 'RJ Sa-Ma (1 keys)' })
    expect(opts.slice(2, -1).map((o) => o.value)).toEqual(TANPURA_SAMPLES.map((s) => s.url))
    expect(opts.at(-1)?.value).toBe(AUTO_INSTRUMENT)
  })
})
