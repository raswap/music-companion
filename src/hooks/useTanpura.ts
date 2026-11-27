import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureAudioRunning } from '../audio/audio-context'
import { Tanpura, nearestSample, playbackRateFor, type FirstString, type TanpuraSample } from '../audio/tanpura'

export interface TanpuraSettings {
  firstString: FirstString
  volume: number
}

export const DEFAULT_TANPURA: TanpuraSettings = { firstString: 'P', volume: 0.7 }

/**
 * Recorded loops in public/tanpura/. `saHz` is the measured madhya Sa of each
 * recording, not the nominal note, so the pitch shift lands exactly on the
 * singer's Sa. Sources and licences are listed in public/tanpura/LICENSES.md.
 * With no entries the synthesized drone is used.
 */
export const TANPURA_SAMPLES: readonly TanpuraSample[] = [
  { url: '/tanpura/tanpura-cs3-sankalp.mp3', saHz: 138.8, label: 'C#3 acoustic' },
  { url: '/tanpura/tanpura-ds3-kaczinski.mp3', saHz: 155.4, label: 'D#3 acoustic' },
  { url: '/tanpura/tanpura-e3-iluppai.mp3', saHz: 161.9, label: 'E3 acoustic' },
]

function pickSample(saHz: number): TanpuraSample | undefined {
  return nearestSample(TANPURA_SAMPLES, saHz)
}

export interface ActiveSample {
  label: string
  /** Signed shift in semitones applied to the recording, after octave folding. */
  shiftSemitones: number
}

function describeSample(sample: TanpuraSample | undefined, saHz: number): ActiveSample | null {
  if (!sample) return null
  // Signed from the folded rate: a female Sa served by a male recording an
  // octave down reads as "down", which is what the ear hears.
  const shift = 12 * Math.log2(playbackRateFor(saHz, sample.saHz))
  return { label: sample.label ?? sample.url, shiftSemitones: shift }
}

export function useTanpura(saHz: number, settings: TanpuraSettings) {
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<'sample' | 'synth' | null>(null)
  const [activeSample, setActiveSample] = useState<ActiveSample | null>(null)
  const [error, setError] = useState<string | null>(null)
  const tanpuraRef = useRef<Tanpura | null>(null)

  const start = useCallback(async () => {
    try {
      const ctx = await ensureAudioRunning()
      tanpuraRef.current ??= new Tanpura(ctx)
      await tanpuraRef.current.start({
        saHz,
        firstString: settings.firstString,
        volume: settings.volume,
        sample: pickSample(saHz),
      })
      setMode(tanpuraRef.current.mode)
      setActiveSample(tanpuraRef.current.mode === 'sample' ? describeSample(pickSample(saHz), saHz) : null)
      setPlaying(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [saHz, settings.firstString, settings.volume])

  const stop = useCallback(() => {
    tanpuraRef.current?.stop()
    setPlaying(false)
    setMode(null)
    setActiveSample(null)
  }, [])

  // Follow Sa / first-string / volume changes while playing. A newer change
  // cancels the state update of an older, still-loading one.
  useEffect(() => {
    if (!playing || !tanpuraRef.current) return
    let cancelled = false
    void tanpuraRef.current
      .update({ saHz, firstString: settings.firstString, volume: settings.volume, sample: pickSample(saHz) })
      .then(() => {
        if (cancelled) return
        const m = tanpuraRef.current?.mode ?? null
        setMode(m)
        setActiveSample(m === 'sample' ? describeSample(pickSample(saHz), saHz) : null)
      })
    return () => {
      cancelled = true
    }
  }, [playing, saHz, settings.firstString, settings.volume])

  useEffect(() => () => tanpuraRef.current?.stop(), [])

  return { playing, mode, activeSample, error, start, stop }
}
