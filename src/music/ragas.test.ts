import { describe, expect, it } from 'vitest'
import { RAGAS, TODI, YAMAN, classify, isAllowed, ragaById } from './ragas'
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

describe('Todi', () => {
  it('allows komal Re, Ga, Dha with tivra Ma and shuddh Ni', () => {
    for (const id of ['S', 'r', 'g', 'M', 'P', 'd', 'N'] as SwaraId[]) {
      expect(isAllowed(TODI, id)).toBe(true)
    }
  })

  it('forbids the shuddh Re, Ga, Dha, shuddh Ma and komal Ni', () => {
    for (const id of ['R', 'G', 'm', 'D', 'n'] as SwaraId[]) {
      expect(isAllowed(TODI, id)).toBe(false)
      expect(TODI.hints[id]).toBeTruthy()
    }
  })

  it('aroha and avaroha only use allowed swaras', () => {
    for (const id of [...TODI.aroha, ...TODI.avaroha]) {
      expect(isAllowed(TODI, id)).toBe(true)
    }
  })

  it('has vadi and samvadi inside the raga', () => {
    expect(isAllowed(TODI, TODI.vadi)).toBe(true)
    expect(isAllowed(TODI, TODI.samvadi)).toBe(true)
  })

  it('flags shuddh Ga as out of raga but accepts komal Ga', () => {
    const at = (id: SwaraId) => frequencyToSwara(swaraToFrequency(id, SA), SA)
    expect(classify(TODI, at('G'))).toBe('out-of-raga')
    expect(classify(TODI, at('g'))).toBe('in-tune')
  })
})

describe('RAGAS registry', () => {
  it('has unique ids and resolves by id', () => {
    const ids = RAGAS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ragaById('todi')).toBe(TODI)
    expect(ragaById('yaman')).toBe(YAMAN)
    expect(ragaById('nope')).toBeUndefined()
  })

  it('every raga has seven swaras, every varjit swara has a hint', () => {
    for (const raga of RAGAS) {
      expect(raga.allowed).toHaveLength(7)
      const varjit = (['S','r','R','g','G','m','M','P','d','D','n','N'] as SwaraId[]).filter((s) => !isAllowed(raga, s))
      for (const v of varjit) expect(raga.hints[v], `${raga.name} hint for ${v}`).toBeTruthy()
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
