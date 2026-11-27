import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureAudioRunning } from '../audio/audio-context'
import { Tanpura, nearestSample, playbackRateFor, type FirstString, type TanpuraSample } from '../audio/tanpura'

export interface TanpuraSettings {
  firstString: FirstString
  volume: number
  /** High-shelf tone control in dB, 0 = as recorded. */
  brightness: number
  /**
   * Which recording to use: a sample url for one recording across all keys
   * (consistent timbre, up to six semitones of pitch shift), `set:<id>` for
   * the nearest key within a multi-key set of one instrument, or 'auto' to
   * pick the nearest recording of any kind.
   */
  instrument: string
}

/**
 * Recorded loops in public/tanpura/. `saHz` is the measured madhya Sa of each
 * recording, not the nominal note, so the pitch shift lands exactly on the
 * singer's Sa. Sources and licences are listed in public/tanpura/LICENSES.md.
 * With no entries the synthesized drone is used.
 */
export const TANPURA_SAMPLES: readonly TanpuraSample[] = [
  { url: '/tanpura/tanpura-cs3-sankalp.mp3', saHz: 138.8, label: 'Acoustic tanpura (recorded in C#)' },
  { url: '/tanpura/tanpura-ds3-kaczinski.mp3', saHz: 155.4, label: '8-string tambura (recorded in D#)' },
  { url: '/tanpura/tanpura-e3-iluppai.mp3', saHz: 161.9, label: 'Flat tanpura (recorded in E)' },
]

export const AUTO_INSTRUMENT = 'auto'
export const SET_PREFIX = 'set:'
/** Optional, gitignored manifest written by scripts/fetch-local-tanpura.mjs. */
export const LOCAL_MANIFEST_URL = '/tanpura/local/manifest.json'

export const DEFAULT_TANPURA: TanpuraSettings = {
  firstString: 'P',
  volume: 0.7,
  brightness: 0,
  instrument: TANPURA_SAMPLES[0].url,
}

/** Prefer recordings whose first string matches; fall back to all when none do. */
function matchingFirstString(samples: readonly TanpuraSample[], firstString: FirstString): readonly TanpuraSample[] {
  const matching = samples.filter((s) => (s.firstString ?? 'P') === firstString)
  return matching.length ? matching : samples
}

export function pickSample(
  saHz: number,
  instrument: string,
  firstString: FirstString = 'P',
  samples: readonly TanpuraSample[] = TANPURA_SAMPLES,
): TanpuraSample | undefined {
  if (instrument.startsWith(SET_PREFIX)) {
    const id = instrument.slice(SET_PREFIX.length)
    const inSet = samples.filter((s) => s.set === id)
    if (inSet.length) return nearestSample(matchingFirstString(inSet, firstString), saHz)
  } else if (instrument !== AUTO_INSTRUMENT) {
    const fixed = samples.find((s) => s.url === instrument)
    if (fixed) return fixed
  }
  return nearestSample(matchingFirstString(samples, firstString), saHz)
}

/** Dropdown entries: one per multi-key set, then each standalone recording. */
export interface InstrumentOption {
  value: string
  label: string
}

export function instrumentOptions(samples: readonly TanpuraSample[]): InstrumentOption[] {
  const sets = new Map<string, { label: string; count: number }>()
  const singles: TanpuraSample[] = []
  for (const s of samples) {
    if (s.set) {
      const e = sets.get(s.set) ?? { label: s.setLabel ?? s.set, count: 0 }
      e.count++
      sets.set(s.set, e)
    } else singles.push(s)
  }
  return [
    ...[...sets].map(([id, e]) => ({ value: SET_PREFIX + id, label: `${e.label} (${e.count} keys)` })),
    ...singles.map((s) => ({ value: s.url, label: s.label ?? s.url })),
    { value: AUTO_INSTRUMENT, label: 'Auto: nearest recording to my Sa' },
  ]
}

async function loadLocalSamples(): Promise<TanpuraSample[]> {
  try {
    const res = await fetch(LOCAL_MANIFEST_URL, { cache: 'no-store' })
    if (!res.ok) return []
    const list = (await res.json()) as TanpuraSample[]
    return Array.isArray(list) ? list.filter((s) => typeof s.url === 'string' && s.saHz > 0) : []
  } catch {
    return []
  }
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
  const [samples, setSamples] = useState<readonly TanpuraSample[]>(TANPURA_SAMPLES)
  const tanpuraRef = useRef<Tanpura | null>(null)

  // Local development recordings, if scripts/fetch-local-tanpura.mjs has run.
  useEffect(() => {
    let cancelled = false
    void loadLocalSamples().then((local) => {
      if (!cancelled && local.length) setSamples([...local, ...TANPURA_SAMPLES])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const chosen = pickSample(saHz, settings.instrument, settings.firstString, samples)

  const start = useCallback(async () => {
    try {
      const ctx = await ensureAudioRunning()
      tanpuraRef.current ??= new Tanpura(ctx)
      await tanpuraRef.current.start({
        saHz,
        firstString: settings.firstString,
        volume: settings.volume,
        brightness: settings.brightness,
        sample: chosen,
      })
      setMode(tanpuraRef.current.mode)
      setActiveSample(tanpuraRef.current.mode === 'sample' ? describeSample(chosen, saHz) : null)
      setPlaying(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [saHz, settings.firstString, settings.volume, settings.brightness, chosen])

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
      .update({
        saHz,
        firstString: settings.firstString,
        volume: settings.volume,
        brightness: settings.brightness,
        sample: chosen,
      })
      .then(() => {
        if (cancelled) return
        const m = tanpuraRef.current?.mode ?? null
        setMode(m)
        setActiveSample(m === 'sample' ? describeSample(chosen, saHz) : null)
      })
    return () => {
      cancelled = true
    }
  }, [playing, saHz, settings.firstString, settings.volume, settings.brightness, chosen])

  useEffect(() => () => tanpuraRef.current?.stop(), [])

  return { playing, mode, activeSample, error, samples, start, stop }
}
