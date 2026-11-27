import { BASE_NOTE_MENU, SA_OCTAVES, formatSa, hzToSa, saToHz, type SaSetting } from '../music/sa'

interface Props {
  sa: SaSetting
  onChange: (sa: SaSetting) => void
  /** Current detected frequency, enables "capture Sa from voice". */
  detectedHz: number | null
}

export function SaSelector({ sa, onChange, detectedHz }: Props) {
  return (
    <section className="panel" aria-labelledby="sa-heading">
      <h2 id="sa-heading">Sa</h2>
      <div className="row">
        <label>
          Note
          <select value={sa.note} onChange={(e) => onChange({ ...sa, note: e.target.value as SaSetting['note'] })}>
            {BASE_NOTE_MENU.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Octave
          <select value={sa.octave} onChange={(e) => onChange({ ...sa, octave: Number(e.target.value) })}>
            {SA_OCTAVES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Fine tune <span className="mono">{sa.fineCents > 0 ? '+' : ''}{sa.fineCents}¢</span>
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={sa.fineCents}
          onChange={(e) => onChange({ ...sa, fineCents: Number(e.target.value) })}
        />
      </label>
      <div className="row between">
        <span className="mono">
          {formatSa(sa)} · {saToHz(sa).toFixed(1)} Hz
        </span>
        <button
          type="button"
          disabled={detectedHz === null}
          title={detectedHz === null ? 'Start listening and sing your Sa' : 'Use the note you are singing as Sa'}
          onClick={() => detectedHz !== null && onChange(hzToSa(detectedHz))}
        >
          Capture from voice
        </button>
      </div>
    </section>
  )
}
