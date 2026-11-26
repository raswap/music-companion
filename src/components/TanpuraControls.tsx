import type { FirstString } from '../audio/tanpura'
import type { TanpuraSettings } from '../hooks/useTanpura'

interface Props {
  settings: TanpuraSettings
  onChange: (settings: TanpuraSettings) => void
  playing: boolean
  mode: 'sample' | 'synth' | null
  error: string | null
  onStart: () => void
  onStop: () => void
}

const FIRST_STRINGS: ReadonlyArray<{ id: FirstString; label: string }> = [
  { id: 'P', label: 'Pa' },
  { id: 'm', label: 'Ma' },
  { id: 'N', label: 'Ni' },
]

export function TanpuraControls({ settings, onChange, playing, mode, error, onStart, onStop }: Props) {
  return (
    <section className="panel" aria-labelledby="tanpura-heading">
      <h2 id="tanpura-heading">Tanpura</h2>
      <div className="row between">
        <button type="button" className={playing ? 'active' : ''} onClick={playing ? onStop : onStart}>
          {playing ? 'Stop' : 'Play'}
        </button>
        {mode === 'synth' && <span className="hint">synthesized drone (no samples loaded)</span>}
      </div>
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
