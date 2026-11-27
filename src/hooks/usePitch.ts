import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureAudioRunning, isMicrophoneSupported } from '../audio/audio-context'
import { MicrophoneInput, listMicrophones, type MicrophoneDevice } from '../audio/mic'
import { PitchDetector, rootMeanSquare } from '../audio/pitch-detector'
import { frequencyToSwara, type SwaraReading } from '../music/swaras'

const FRAME_SIZE = 2048
const HOP_SIZE = 512
export const HISTORY_SECONDS = 10
const DEVICE_STORAGE_KEY = 'music-companion.micDeviceId'

function loadSavedDevice(): string {
  try {
    return localStorage.getItem(DEVICE_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export interface PitchPoint {
  /** performance.now() in ms. */
  time: number
  /** Cents above madhya Sa, or null for silence. */
  centsFromSa: number | null
}

export interface PitchState {
  listening: boolean
  error: string | null
  /** Input level 0..1 (RMS), updated while listening even when no pitch is found. */
  level: number
  /** Input devices the browser offers; labels appear after the first permission grant. */
  devices: readonly MicrophoneDevice[]
  /** Selected device id, '' for the browser default. */
  deviceId: string
  /** Label of the device currently open, if listening. */
  activeDevice: string | null
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
  const [level, setLevel] = useState(0)
  const [devices, setDevices] = useState<readonly MicrophoneDevice[]>([])
  const [deviceId, setDeviceIdState] = useState<string>(loadSavedDevice)
  const [activeDevice, setActiveDevice] = useState<string | null>(null)

  const micRef = useRef<MicrophoneInput | null>(null)
  const detectorRef = useRef<PitchDetector | null>(null)
  const saRef = useRef(saHz)
  const historyRef = useRef<PitchPoint[]>([])
  const deviceRef = useRef(deviceId)
  useEffect(() => {
    saRef.current = saHz
  }, [saHz])

  const refreshDevices = useCallback(async () => {
    setDevices(await listMicrophones())
  }, [])

  // Keep the list current when devices are plugged in or removed.
  useEffect(() => {
    const md = navigator.mediaDevices
    if (!md?.addEventListener) return
    md.addEventListener('devicechange', refreshDevices)
    return () => md.removeEventListener('devicechange', refreshDevices)
  }, [refreshDevices])

  const start = useCallback(async () => {
    if (micRef.current?.running) return
    if (!isMicrophoneSupported()) {
      setError('This browser does not support microphone input.')
      return
    }
    try {
      const ctx = await ensureAudioRunning()
      detectorRef.current ??= new PitchDetector(FRAME_SIZE)
      const mic = new MicrophoneInput(ctx, {
        frameSize: FRAME_SIZE,
        hopSize: HOP_SIZE,
        deviceId: deviceRef.current || undefined,
      })
      await mic.start((frame, sampleRate) => {
        setLevel(rootMeanSquare(frame))
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
      setActiveDevice(mic.activeLabel)
      setError(null)
      setListening(true)
      // Labels become available once permission has been granted.
      void refreshDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setListening(false)
    }
  }, [refreshDevices])

  const stop = useCallback(() => {
    micRef.current?.stop()
    micRef.current = null
    historyRef.current = []
    setHistory([])
    setReading(null)
    setLevel(0)
    setActiveDevice(null)
    setListening(false)
  }, [])

  /** Choose an input device. If listening, the microphone is reopened on it. */
  const setDeviceId = useCallback(
    async (id: string) => {
      deviceRef.current = id
      setDeviceIdState(id)
      try {
        localStorage.setItem(DEVICE_STORAGE_KEY, id)
      } catch {
        /* storage unavailable; selection lasts for this page load */
      }
      if (micRef.current?.running) {
        stop()
        await start()
      }
    },
    [start, stop],
  )

  useEffect(() => () => micRef.current?.stop(), [])

  return {
    listening,
    error,
    level,
    devices,
    deviceId,
    activeDevice,
    reading,
    history,
    start,
    stop,
    setDeviceId,
    refreshDevices,
  } satisfies PitchState & {
    start: () => Promise<void>
    stop: () => void
    setDeviceId: (id: string) => Promise<void>
    refreshDevices: () => Promise<void>
  }
}
