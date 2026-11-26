import { describe, expect, it } from 'vitest'
import { SWARAS, SWARA_BY_ID, centsBetween, frequencyToSwara, swaraToFrequency } from './swaras'

const SA = 220 // A3, convenient round number

describe('SWARAS table', () => {
  it('has twelve ascending positions starting at Sa', () => {
    expect(SWARAS).toHaveLength(12)
    expect(SWARAS[0].id).toBe('S')
    expect(SWARAS[0].cents).toBe(0)
    for (let i = 1; i < SWARAS.length; i++) {
      expect(SWARAS[i].cents).toBeGreaterThan(SWARAS[i - 1].cents)
    }
    expect(SWARAS[11].cents).toBeLessThan(1200)
  })

  it('places tivra Ma above shuddh Ma and below Pa', () => {
    expect(SWARA_BY_ID.M.cents).toBeGreaterThan(SWARA_BY_ID.m.cents)
    expect(SWARA_BY_ID.M.cents).toBeLessThan(SWARA_BY_ID.P.cents)
    expect(SWARA_BY_ID.P.cents).toBeCloseTo(701.955, 2)
  })
})

describe('frequencyToSwara', () => {
  it('maps Sa exactly', () => {
    const r = frequencyToSwara(SA, SA)
    expect(r.swara.id).toBe('S')
    expect(r.octave).toBe(0)
    expect(r.saptak).toBe('madhya')
    expect(r.cents).toBeCloseTo(0, 6)
  })

  it('round-trips every swara in madhya saptak', () => {
    for (const swara of SWARAS) {
      const hz = swaraToFrequency(swara, SA)
      const r = frequencyToSwara(hz, SA)
      expect(r.swara.id).toBe(swara.id)
      expect(r.octave).toBe(0)
      expect(Math.abs(r.cents)).toBeLessThan(1e-6)
    }
  })

  it('reports sharp and flat deviations with the right sign', () => {
    const paHz = swaraToFrequency('P', SA)
    const sharp = frequencyToSwara(paHz * 2 ** (20 / 1200), SA)
    const flat = frequencyToSwara(paHz * 2 ** (-20 / 1200), SA)
    expect(sharp.swara.id).toBe('P')
    expect(sharp.cents).toBeCloseTo(20, 5)
    expect(flat.swara.id).toBe('P')
    expect(flat.cents).toBeCloseTo(-20, 5)
  })

  it('handles mandra and taar saptak', () => {
    const mandraPa = frequencyToSwara(swaraToFrequency('P', SA, -1), SA)
    expect(mandraPa.swara.id).toBe('P')
    expect(mandraPa.octave).toBe(-1)
    expect(mandraPa.saptak).toBe('mandra')

    const taarSa = frequencyToSwara(SA * 2, SA)
    expect(taarSa.swara.id).toBe('S')
    expect(taarSa.octave).toBe(1)
    expect(taarSa.saptak).toBe('taar')
  })

  it('snaps a slightly flat taar Sa to Sa, not Ni', () => {
    const r = frequencyToSwara(SA * 2 * 2 ** (-30 / 1200), SA)
    expect(r.swara.id).toBe('S')
    expect(r.octave).toBe(1)
    expect(r.cents).toBeCloseTo(-30, 5)
  })

  it('distinguishes shuddh Ma from tivra Ma', () => {
    const m = frequencyToSwara(SA * (4 / 3), SA)
    const M = frequencyToSwara(SA * (45 / 32), SA)
    expect(m.swara.id).toBe('m')
    expect(M.swara.id).toBe('M')
  })

  it('rejects non-positive input', () => {
    expect(() => frequencyToSwara(0, SA)).toThrow(RangeError)
    expect(() => frequencyToSwara(SA, -1)).toThrow(RangeError)
  })
})

describe('centsBetween', () => {
  it('returns 1200 for an octave', () => {
    expect(centsBetween(440, 220)).toBeCloseTo(1200, 9)
  })
})
