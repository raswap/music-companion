/**
 * Swara definitions and frequency <-> swara mapping.
 *
 * All pitch maths is relative to the singer's chosen Sa, using just-intonation
 * ratios. The ratio table is the single source of truth and can be tuned later
 * (for example to a 22-shruti model) without touching the rest of the app.
 */

/** Single-letter swara ids. Lower case = komal (flat), upper case = shuddh, M = tivra Ma. */
export type SwaraId = 'S' | 'r' | 'R' | 'g' | 'G' | 'm' | 'M' | 'P' | 'd' | 'D' | 'n' | 'N'

export interface Swara {
  id: SwaraId
  /** Full name, e.g. "komal Re", "tivra Ma". */
  name: string
  /** Display label used in the UI, e.g. "Re♭", "Ma♯". */
  label: string
  /** Just-intonation ratio relative to Sa as [numerator, denominator]. */
  ratio: readonly [number, number]
  /** Position above Sa in cents, derived from `ratio`. */
  cents: number
}

const CENTS_PER_OCTAVE = 1200

function define(id: SwaraId, name: string, label: string, num: number, den: number): Swara {
  return {
    id,
    name,
    label,
    ratio: [num, den],
    cents: CENTS_PER_OCTAVE * Math.log2(num / den),
  }
}

/** The twelve swara positions in one saptak, ascending from Sa. */
export const SWARAS: readonly Swara[] = [
  define('S', 'Sa', 'Sa', 1, 1),
  define('r', 'komal Re', 'Re♭', 16, 15),
  define('R', 'Re', 'Re', 9, 8),
  define('g', 'komal Ga', 'Ga♭', 6, 5),
  define('G', 'Ga', 'Ga', 5, 4),
  define('m', 'Ma', 'Ma', 4, 3),
  define('M', 'tivra Ma', 'Ma♯', 45, 32),
  define('P', 'Pa', 'Pa', 3, 2),
  define('d', 'komal Dha', 'Dha♭', 8, 5),
  define('D', 'Dha', 'Dha', 5, 3),
  define('n', 'komal Ni', 'Ni♭', 9, 5),
  define('N', 'Ni', 'Ni', 15, 8),
]

export const SWARA_BY_ID: Readonly<Record<SwaraId, Swara>> = Object.fromEntries(
  SWARAS.map((s) => [s.id, s]),
) as Record<SwaraId, Swara>

/** Saptak (octave register) names relative to the singer's madhya Sa. */
export type Saptak = 'ati-mandra' | 'mandra' | 'madhya' | 'taar' | 'ati-taar'

export interface SwaraReading {
  swara: Swara
  /** Octave offset from madhya Sa: -1 = mandra, 0 = madhya, +1 = taar. */
  octave: number
  saptak: Saptak
  /** Deviation from the just-intonation ideal in cents. Negative = flat, positive = sharp. */
  cents: number
  /** The detected frequency in Hz. */
  frequency: number
  /** Total distance above madhya Sa in cents (can be negative in mandra saptak). */
  centsFromSa: number
}

/** Signed distance in cents from `reference` to `frequency`. */
export function centsBetween(frequency: number, reference: number): number {
  return CENTS_PER_OCTAVE * Math.log2(frequency / reference)
}

export function saptakForOctave(octave: number): Saptak {
  if (octave <= -2) return 'ati-mandra'
  if (octave === -1) return 'mandra'
  if (octave === 0) return 'madhya'
  if (octave === 1) return 'taar'
  return 'ati-taar'
}

/**
 * Map a frequency to the nearest swara relative to the given Sa.
 *
 * The nearest match is chosen by absolute cents distance, so the deviation is
 * always within roughly ±60 cents (half the widest gap between neighbours).
 */
export function frequencyToSwara(frequency: number, saHz: number): SwaraReading {
  if (!(frequency > 0) || !(saHz > 0)) {
    throw new RangeError('frequency and saHz must be positive numbers')
  }

  const centsFromSa = centsBetween(frequency, saHz)
  let octave = Math.floor(centsFromSa / CENTS_PER_OCTAVE)
  const within = centsFromSa - octave * CENTS_PER_OCTAVE // 0 <= within < 1200

  let best = SWARAS[0]
  let bestDeviation = within
  for (const swara of SWARAS) {
    const deviation = within - swara.cents
    if (Math.abs(deviation) < Math.abs(bestDeviation)) {
      best = swara
      bestDeviation = deviation
    }
  }

  // The Sa of the next saptak sits at 1200 cents; a high Ni may be closer to it.
  const deviationFromUpperSa = within - CENTS_PER_OCTAVE
  if (Math.abs(deviationFromUpperSa) < Math.abs(bestDeviation)) {
    best = SWARAS[0]
    bestDeviation = deviationFromUpperSa
    octave += 1
  }

  return {
    swara: best,
    octave,
    saptak: saptakForOctave(octave),
    cents: bestDeviation,
    frequency,
    centsFromSa,
  }
}

/** Ideal frequency of a swara in the given octave relative to Sa. */
export function swaraToFrequency(swara: Swara | SwaraId, saHz: number, octave = 0): number {
  const s = typeof swara === 'string' ? SWARA_BY_ID[swara] : swara
  const [num, den] = s.ratio
  return saHz * (num / den) * 2 ** octave
}
