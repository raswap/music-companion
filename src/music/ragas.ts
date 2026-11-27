import type { SwaraId, SwaraReading } from './swaras'

export interface Raga {
  id: string
  name: string
  thaat: string
  /** Swaras permitted in the raga. Anything else is varjit (forbidden). */
  allowed: readonly SwaraId[]
  /** Ascending pattern. A trailing apostrophe convention is not used; octaves are implied. */
  aroha: readonly SwaraId[]
  avaroha: readonly SwaraId[]
  vadi: SwaraId
  samvadi: SwaraId
  /** Short teaching note shown in the UI. */
  description: string
  /** Corrective hints keyed by the forbidden swara that was sung. */
  hints: Partial<Record<SwaraId, string>>
}

export const YAMAN: Raga = {
  id: 'yaman',
  name: 'Yaman',
  thaat: 'Kalyan',
  allowed: ['S', 'R', 'G', 'M', 'P', 'D', 'N'],
  aroha: ['N', 'R', 'G', 'M', 'D', 'N', 'S'],
  avaroha: ['S', 'N', 'D', 'P', 'M', 'G', 'R', 'S'],
  vadi: 'G',
  samvadi: 'N',
  description: 'All shuddh swaras with tivra Ma. Sampoorna, evening raga of the Kalyan thaat.',
  hints: {
    m: 'Shuddh Ma is varjit in Yaman. Use tivra Ma (Ma♯).',
    r: 'Komal Re is varjit in Yaman. Use shuddh Re.',
    g: 'Komal Ga is varjit in Yaman. Use shuddh Ga.',
    d: 'Komal Dha is varjit in Yaman. Use shuddh Dha.',
    n: 'Komal Ni is varjit in Yaman. Use shuddh Ni.',
  },
}

export const TODI: Raga = {
  id: 'todi',
  name: 'Todi',
  thaat: 'Todi',
  allowed: ['S', 'r', 'g', 'M', 'P', 'd', 'N'],
  aroha: ['S', 'r', 'g', 'M', 'd', 'N', 'S'],
  avaroha: ['S', 'N', 'd', 'P', 'M', 'g', 'r', 'S'],
  vadi: 'd',
  samvadi: 'g',
  description:
    'Komal Re, Ga and Dha with tivra Ma and shuddh Ni. Late-morning raga of the Todi thaat (Miyan ki Todi).',
  hints: {
    R: 'Shuddh Re is varjit in Todi. Use komal Re (Re♭).',
    G: 'Shuddh Ga is varjit in Todi. Use komal Ga (Ga♭).',
    m: 'Shuddh Ma is varjit in Todi. Use tivra Ma (Ma♯).',
    D: 'Shuddh Dha is varjit in Todi. Use komal Dha (Dha♭).',
    n: 'Komal Ni is varjit in Todi. Use shuddh Ni.',
  },
}

export const RAGAS: readonly Raga[] = [YAMAN, TODI]

export function ragaById(id: string): Raga | undefined {
  return RAGAS.find((r) => r.id === id)
}

export function isAllowed(raga: Raga, swara: SwaraId): boolean {
  return raga.allowed.includes(swara)
}

/** Intonation classification used for colour coding in the UI. */
export type Intonation = 'in-tune' | 'slightly-off' | 'off' | 'out-of-raga'

export interface IntonationThresholds {
  /** |cents| at or below this is "in tune" (green). */
  inTune: number
  /** |cents| at or below this is "slightly off" (amber); beyond is "off". */
  slightlyOff: number
}

export const DEFAULT_THRESHOLDS: IntonationThresholds = { inTune: 15, slightlyOff: 35 }

export function classify(
  raga: Raga,
  reading: SwaraReading,
  thresholds: IntonationThresholds = DEFAULT_THRESHOLDS,
): Intonation {
  if (!isAllowed(raga, reading.swara.id)) return 'out-of-raga'
  const deviation = Math.abs(reading.cents)
  if (deviation <= thresholds.inTune) return 'in-tune'
  if (deviation <= thresholds.slightlyOff) return 'slightly-off'
  return 'off'
}
