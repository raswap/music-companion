import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureAudioRunning } from '../audio/audio-context'
import { Tanpura, type FirstString, type TanpuraSample } from '../audio/tanpura'

export interface TanpuraSettings {
  firstString: FirstString
  volume: number
}

export const DEFAULT_TANPURA: TanpuraSettings = { firstString: 'P', volume: 0.7 }

/**
 * Optional recorded loops keyed by the note the sample was recorded in.
 * Drop files into public/tanpura/ and register them here; see public/tanpura/README.md.
 * With no entries the synthesized drone is used.
 */
export const TANPURA_SAMPLES: readonly TanpuraSample[] = []

function pickSample(saHz: number): TanpuraSample | undefined {
  if (TANPURA_SAMPLES.length === 0) return undefined
  // Nearest recorded Sa minimises pitch-shift artefacts.
  return [...TANPURA_SAMPLES].sort(
    (a, b) => Math.abs(Math.log2(a.saHz / saHz)) - Math.abs(Math.log2(b.saHz / saHz)),
  )[0]
}

export function useTanpura(saHz: number, settings: TanpuraSettings) {
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<'sample' | 'synth' | null>(null)
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
  }, [])

  // Follow Sa / first-string / volume changes while playing.
  useEffect(() => {
    if (!playing || !tanpuraRef.current) return
    void tanpuraRef.current
      .update({ saHz, firstString: settings.firstString, volume: settings.volume, sample: pickSample(saHz) })
      .then(() => setMode(tanpuraRef.current?.mode ?? null))
  }, [playing, saHz, settings.firstString, settings.volume])

  useEffect(() => () => tanpuraRef.current?.stop(), [])

  return { playing, mode, error, start, stop }
}
