import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureAudioRunning, isMicrophoneSupported } from '../audio/audio-context'
import { MicrophoneInput } from '../audio/mic'
import { PitchDetector } from '../audio/pitch-detector'
import { frequencyToSwara, type SwaraReading } from '../music/swaras'

const FRAME_SIZE = 2048
const HOP_SIZE = 512
export const HISTORY_SECONDS = 10

export interface PitchPoint {
  /** performance.now() in ms. */
  time: number
  /** Cents above madhya Sa, or null for silence. */
  centsFromSa: number | null
}

export interface PitchState {
  listening: boolean
  error: string | null
  /** Latest reading, or null when silent / unvoiced. */
  reading: SwaraReading | null
  /** Ring of recent points for the scrolling tape, oldest first. */
  history: readonly PitchPoint[]
}

/**
 * Opens the microphone on demand and turns frames into swara readings.
 * `saHz` can change while listening; the mapping updates on the next frame.
 */
export function usePitch(saHz: number) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState<SwaraReading | null>(null)
  const [history, setHistory] = useState<readonly PitchPoint[]>([])

  const micRef = useRef<MicrophoneInput | null>(null)
  const detectorRef = useRef<PitchDetector | null>(null)
  const saRef = useRef(saHz)
  const historyRef = useRef<PitchPoint[]>([])
  useEffect(() => {
    saRef.current = saHz
  }, [saHz])

  const start = useCallback(async () => {
    if (micRef.current?.running) return
    if (!isMicrophoneSupported()) {
      setError('This browser does not support microphone input.')
      return
    }
    try {
      const ctx = await ensureAudioRunning()
      detectorRef.current ??= new PitchDetector(FRAME_SIZE)
      const mic = new MicrophoneInput(ctx, { frameSize: FRAME_SIZE, hopSize: HOP_SIZE })
      await mic.start((frame, sampleRate) => {
        const estimate = detectorRef.current!.detect(frame, sampleRate)
        const next = estimate ? frequencyToSwara(estimate.frequency, saRef.current) : null
        const now = performance.now()
        const cutoff = now - HISTORY_SECONDS * 1000
        const hist = historyRef.current
        hist.push({ time: now, centsFromSa: next?.centsFromSa ?? null })
        while (hist.length && hist[0].time < cutoff) hist.shift()
        setReading(next)
        setHistory([...hist])
      })
      micRef.current = mic
      setError(null)
      setListening(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setListening(false)
    }
  }, [])

  const stop = useCallback(() => {
    micRef.current?.stop()
    micRef.current = null
    historyRef.current = []
    setHistory([])
    setReading(null)
    setListening(false)
  }, [])

  useEffect(() => () => micRef.current?.stop(), [])

  return { listening, error, reading, history, start, stop } satisfies PitchState & {
    start: () => Promise<void>
    stop: () => void
  }
}
