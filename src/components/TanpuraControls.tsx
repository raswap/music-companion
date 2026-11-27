import type { FirstString } from '../audio/tanpura'
import { AUTO_INSTRUMENT, TANPURA_SAMPLES, type ActiveSample, type TanpuraSettings } from '../hooks/useTanpura'

interface Props {
  settings: TanpuraSettings
  onChange: (settings: TanpuraSettings) => void
  playing: boolean
  mode: 'sample' | 'synth' | null
  activeSample: ActiveSample | null
  error: string | null
  onStart: () => void
  onStop: () => void
}

const FIRST_STRINGS: ReadonlyArray<{ id: FirstString; label: string }> = [
  { id: 'P', label: 'Pa' },
  { id: 'm', label: 'Ma' },
  { id: 'N', label: 'Ni' },
]

function shiftLabel(semitones: number): string {
  if (Math.abs(semitones) < 0.05) return 'as recorded'
  const n = Math.abs(semitones).toFixed(1).replace(/\.0$/, '')
  return `${semitones > 0 ? 'up' : 'down'} ${n} semitone${n === '1' ? '' : 's'}`
}

export function TanpuraControls({ settings, onChange, playing, mode, activeSample, error, onStart, onStop }: Props) {
  return (
    <section className="panel" aria-labelledby="tanpura-heading">
      <h2 id="tanpura-heading">Tanpura</h2>
      <div className="row between">
        <button type="button" className={playing ? 'active' : ''} onClick={playing ? onStop : onStart}>
          {playing ? 'Stop' : 'Play'}
        </button>
        {mode === 'synth' && <span className="hint">synthesized drone (sample unavailable)</span>}
        {mode === 'sample' && activeSample && (
          <span className="hint">{shiftLabel(activeSample.shiftSemitones)}</span>
        )}
      </div>
      <label>
        Instrument
        <select
          id="tanpura-instrument"
          value={settings.instrument}
          onChange={(e) => onChange({ ...settings, instrument: e.target.value })}
        >
          {TANPURA_SAMPLES.map((s) => (
            <option key={s.url} value={s.url}>
              {s.label}
            </option>
          ))}
          <option value={AUTO_INSTRUMENT}>Auto: nearest recording to my Sa</option>
        </select>
      </label>
      <fieldset className="row">
        <legend>First string</legend>
        {FIRST_STRINGS.map((s) => (
          <label key={s.id} className="radio">
            <input
              type="radio"
              name="first-string"
              value={s.id}
              checked={settings.firstString === s.id}
              onChange={() => onChange({ ...settings, firstString: s.id })}
            />
            {s.label}
          </label>
        ))}
      </fieldset>
      <label>
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.volume}
          onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) })}
        />
      </label>
      {error && <p className="error">{error}</p>}
    </section>
  )
}
