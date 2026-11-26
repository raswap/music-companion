import { PitchDetector as PitchyDetector } from 'pitchy'

export interface PitchEstimate {
  /** Fundamental frequency in Hz. */
  frequency: number
  /** 0..1 confidence from the McLeod pitch method. */
  clarity: number
  /** RMS level of the frame, linear 0..1. */
  rms: number
}

export interface PitchDetectorOptions {
  /** Frames with clarity below this are treated as unvoiced. */
  minClarity: number
  /** Frames quieter than this RMS (linear) are treated as silence. */
  minRms: number
  /** Reject estimates outside the plausible vocal range. */
  minFrequency: number
  maxFrequency: number
}

export const DEFAULT_PITCH_OPTIONS: PitchDetectorOptions = {
  minClarity: 0.9,
  minRms: 0.01,
  minFrequency: 60,
  maxFrequency: 1200,
}

/**
 * Thin wrapper over Pitchy (MIT licence) that adds silence and range gating.
 * One instance per frame size; `detect` is allocation-free after construction.
 */
export class PitchDetector {
  private readonly detector: PitchyDetector<Float32Array>
  private readonly options: PitchDetectorOptions

  constructor(frameSize: number, options: PitchDetectorOptions = DEFAULT_PITCH_OPTIONS) {
    this.detector = PitchyDetector.forFloat32Array(frameSize)
    this.options = options
  }

  /** Returns null when the frame is silent, unvoiced, or out of range. */
  detect(frame: Float32Array, sampleRate: number): PitchEstimate | null {
    const rms = rootMeanSquare(frame)
    if (rms < this.options.minRms) return null

    const [frequency, clarity] = this.detector.findPitch(frame, sampleRate)
    if (clarity < this.options.minClarity) return null
    if (frequency < this.options.minFrequency || frequency > this.options.maxFrequency) return null

    return { frequency, clarity, rms }
  }
}

export function rootMeanSquare(frame: Float32Array): number {
  let sum = 0
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
  return Math.sqrt(sum / frame.length)
}
