import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { CentsMeter } from './components/CentsMeter'
import { InputLevel } from './components/InputLevel'
import { MicSelector } from './components/MicSelector'
import { PitchTape } from './components/PitchTape'
import { RagaAlert } from './components/RagaAlert'
import { RagaSelector } from './components/RagaSelector'
import { SaSelector } from './components/SaSelector'
import { SwaraDisplay } from './components/SwaraDisplay'
import { TanpuraControls } from './components/TanpuraControls'
import { usePitch } from './hooks/usePitch'
import { DEFAULT_TANPURA, useTanpura, type TanpuraSettings } from './hooks/useTanpura'
import { NoteStabilizer } from './music/note-stabilizer'
import { YAMAN, classify, isAllowed, ragaById, type Raga } from './music/ragas'
import { DEFAULT_SA, saToHz, type SaSetting } from './music/sa'
import type { SwaraId } from './music/swaras'

const RAGA_STORAGE_KEY = 'music-companion.raga'

function loadSavedRaga(): Raga {
  try {
    return ragaById(localStorage.getItem(RAGA_STORAGE_KEY) ?? '') ?? YAMAN
  } catch {
    return YAMAN
  }
}

export default function App() {
  const [raga, setRagaState] = useState<Raga>(loadSavedRaga)
  const setRaga = (next: Raga) => {
    setRagaState(next)
    try {
      localStorage.setItem(RAGA_STORAGE_KEY, next.id)
    } catch {
      /* selection lasts for this page load */
    }
  }
  const [sa, setSa] = useState<SaSetting>(DEFAULT_SA)
  const [tanpuraSettings, setTanpuraSettings] = useState<TanpuraSettings>(DEFAULT_TANPURA)
  const saHz = useMemo(() => saToHz(sa), [sa])

  const pitch = usePitch(saHz)
  const tanpura = useTanpura(saHz, tanpuraSettings)

  const intonation = pitch.reading ? classify(raga, pitch.reading) : null

  // Only warn about varjit swaras once they have been held, not on passing glides.
  const stabilizer = useRef(new NoteStabilizer({ holdMs: 200 }))
  const [varjit, setVarjit] = useState<SwaraId | null>(null)
  useEffect(() => {
    const confirmed = stabilizer.current.push(
      pitch.reading?.swara.id ?? null,
      pitch.reading?.octave ?? 0,
      performance.now(),
    )
    const held = stabilizer.current.current
    if (confirmed || !held) {
      setVarjit(held && !isAllowed(raga, held.swara) ? held.swara : null)
    }
  }, [pitch.reading, raga])

  // A new raga changes what counts as varjit; re-evaluate the held note.
  useEffect(() => {
    const held = stabilizer.current.current
    setVarjit(held && !isAllowed(raga, held.swara) ? held.swara : null)
  }, [raga])

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Music Companion</h1>
          <p className="subtitle">Practice with tanpura and live swara feedback</p>
        </div>
        <RagaSelector raga={raga} onChange={setRaga} />
      </header>

      <section className="feedback">
        <SwaraDisplay reading={pitch.reading} intonation={intonation} />
        <CentsMeter cents={pitch.reading?.cents ?? null} intonation={intonation} />
        <RagaAlert raga={raga} varjitSwara={varjit} />
        <PitchTape history={pitch.history} raga={raga} />
        <div className="row between">
          <button type="button" className={pitch.listening ? 'active' : ''} onClick={pitch.listening ? pitch.stop : pitch.start}>
            {pitch.listening ? 'Stop listening' : 'Start listening'}
          </button>
          {pitch.listening && <InputLevel level={pitch.level} />}
        </div>
        <MicSelector
          devices={pitch.devices}
          deviceId={pitch.deviceId}
          activeDevice={pitch.activeDevice}
          listening={pitch.listening}
          onChange={(id) => void pitch.setDeviceId(id)}
        />
        {pitch.error && <p className="error">{pitch.error}</p>}
      </section>

      <div className="controls">
        <SaSelector sa={sa} onChange={setSa} detectedHz={pitch.reading?.frequency ?? null} />
        <TanpuraControls
          settings={tanpuraSettings}
          onChange={setTanpuraSettings}
          playing={tanpura.playing}
          mode={tanpura.mode}
          activeSample={tanpura.activeSample}
          error={tanpura.error}
          onStart={tanpura.start}
          onStop={tanpura.stop}
        />
      </div>

      <footer className="app-footer">
        <p>Audio stays on your device. Nothing is recorded or uploaded.</p>
      </footer>
    </main>
  )
}
