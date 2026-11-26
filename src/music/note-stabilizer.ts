import type { SwaraId } from './swaras'

/**
 * Debounces a stream of per-frame swara detections into "held" notes.
 *
 * Meend (glides) and gamak (oscillations) pass through neighbouring swaras for
 * a few frames. Firing an out-of-raga warning on every such frame would be
 * noisy and wrong, so a swara only counts as sung once it has been held for
 * `holdMs`. Silence or a change of swara resets the timer.
 */
export interface StabilizerOptions {
  /** How long a swara must persist before it is confirmed. */
  holdMs: number
}

export interface StableNote {
  swara: SwaraId
  octave: number
  /** Timestamp (ms) at which the note was first seen in this hold. */
  since: number
}

export class NoteStabilizer {
  private candidate: StableNote | null = null
  private confirmed: StableNote | null = null
  private readonly options: StabilizerOptions

  constructor(options: StabilizerOptions = { holdMs: 200 }) {
    this.options = options
  }

  /**
   * Feed one detection. Pass `null` for silence / no pitch.
   * Returns the newly confirmed note if this frame confirmed one, else null.
   */
  push(swara: SwaraId | null, octave: number, now: number): StableNote | null {
    if (swara === null) {
      this.candidate = null
      this.confirmed = null
      return null
    }

    if (!this.candidate || this.candidate.swara !== swara || this.candidate.octave !== octave) {
      this.candidate = { swara, octave, since: now }
      return null
    }

    const held = now - this.candidate.since
    const alreadyConfirmed =
      this.confirmed &&
      this.confirmed.swara === swara &&
      this.confirmed.octave === octave &&
      this.confirmed.since === this.candidate.since

    if (held >= this.options.holdMs && !alreadyConfirmed) {
      this.confirmed = this.candidate
      return this.confirmed
    }
    return null
  }

  /** The currently confirmed (held) note, if any. */
  get current(): StableNote | null {
    return this.confirmed
  }

  reset(): void {
    this.candidate = null
    this.confirmed = null
  }
}
