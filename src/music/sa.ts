/**
 * Sa (tonic) selection.
 *
 * The singer chooses a Western base note plus a fine-tuning offset in cents.
 * Internally everything is converted to a frequency in Hz; the rest of the app
 * never cares about note names.
 */

export const BASE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export type BaseNote = (typeof BASE_NOTES)[number]

/** Dropdown ordering requested in the PRD: A up to G#. */
export const BASE_NOTE_MENU: readonly BaseNote[] = [
  'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#',
]

/** Octaves that cover typical vocal Sa ranges (C2 ≈ 65 Hz up to B4 ≈ 494 Hz). */
export const SA_OCTAVES = [2, 3, 4] as const

export interface SaSetting {
  note: BaseNote
  /** Scientific pitch octave number (C4 = middle C). */
  octave: number
  /** Fine tuning in cents, typically within ±50. */
  fineCents: number
}

/** A common male Sa; female singers typically pick G#3 to B3. */
export const DEFAULT_SA: SaSetting = { note: 'C#', octave: 3, fineCents: 0 }

export const A4_HZ = 440

export function saToHz(sa: SaSetting, a4Hz = A4_HZ): number {
  const semitonesFromC = BASE_NOTES.indexOf(sa.note)
  const semitonesFromA4 = semitonesFromC - 9 + (sa.octave - 4) * 12
  return a4Hz * 2 ** ((semitonesFromA4 + sa.fineCents / 100) / 12)
}

/**
 * Convert a sung frequency to the nearest base note with a fine-tuning offset,
 * for the "sing your Sa" capture mode.
 */
export function hzToSa(hz: number, a4Hz = A4_HZ): SaSetting {
  if (!(hz > 0)) throw new RangeError('hz must be positive')
  const semitonesFromA4 = 12 * Math.log2(hz / a4Hz)
  const nearest = Math.round(semitonesFromA4)
  // `+ 0` folds Math.round's -0 into 0 so the result compares cleanly.
  const fineCents = Math.round((semitonesFromA4 - nearest) * 100) + 0
  const semitonesFromC4 = nearest + 9
  const octave = 4 + Math.floor(semitonesFromC4 / 12)
  const noteIndex = ((semitonesFromC4 % 12) + 12) % 12
  return { note: BASE_NOTES[noteIndex], octave, fineCents }
}

export function formatSa(sa: SaSetting): string {
  const fine = sa.fineCents === 0 ? '' : ` ${sa.fineCents > 0 ? '+' : ''}${sa.fineCents}¢`
  return `${sa.note}${sa.octave}${fine}`
}
