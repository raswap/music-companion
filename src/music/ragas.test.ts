import { describe, expect, it } from 'vitest'
import { YAMAN, classify, isAllowed } from './ragas'
import { frequencyToSwara, swaraToFrequency, type SwaraId } from './swaras'

const SA = 220

describe('Yaman', () => {
  it('allows all shuddh swaras plus tivra Ma', () => {
    for (const id of ['S', 'R', 'G', 'M', 'P', 'D', 'N'] as SwaraId[]) {
      expect(isAllowed(YAMAN, id)).toBe(true)
    }
  })

  it('forbids shuddh Ma and all komal swaras', () => {
    for (const id of ['m', 'r', 'g', 'd', 'n'] as SwaraId[]) {
      expect(isAllowed(YAMAN, id)).toBe(false)
      expect(YAMAN.hints[id]).toBeTruthy()
    }
  })

  it('aroha and avaroha only use allowed swaras', () => {
    for (const id of [...YAMAN.aroha, ...YAMAN.avaroha]) {
      expect(isAllowed(YAMAN, id)).toBe(true)
    }
  })
})

describe('classify', () => {
  const at = (id: SwaraId, offsetCents: number) =>
    frequencyToSwara(swaraToFrequency(id, SA) * 2 ** (offsetCents / 1200), SA)

  it('grades intonation by cents deviation', () => {
    expect(classify(YAMAN, at('G', 5))).toBe('in-tune')
    expect(classify(YAMAN, at('G', -14))).toBe('in-tune')
    expect(classify(YAMAN, at('G', 25))).toBe('slightly-off')
    expect(classify(YAMAN, at('G', 45))).toBe('off')
  })

  it('flags shuddh Ma as out of raga even when perfectly in tune', () => {
    expect(classify(YAMAN, at('m', 0))).toBe('out-of-raga')
  })

  it('accepts tivra Ma', () => {
    expect(classify(YAMAN, at('M', 0))).toBe('in-tune')
  })
})
