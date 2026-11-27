interface Props {
  /** RMS level 0..1. */
  level: number
}

/**
 * Small input meter so a singer can tell "no audio is arriving" from
 * "audio arrives but no clear pitch was found".
 */
export function InputLevel({ level }: Props) {
  // Map RMS to a roughly perceptual 0..100% bar. -60 dBFS .. 0 dBFS.
  const db = level > 0 ? 20 * Math.log10(level) : -100
  const percent = Math.max(0, Math.min(100, ((db + 60) / 60) * 100))
  const quiet = db < -50
  return (
    <div className="input-level" title={`${db.toFixed(0)} dBFS`}>
      <span className="hint">{quiet ? 'no input' : 'mic level'}</span>
      <div className="input-level-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label="microphone input level">
        <div className="input-level-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
