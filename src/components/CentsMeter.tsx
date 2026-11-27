import type { Intonation } from '../music/ragas'

interface Props {
  /** Deviation in cents, or null when silent. */
  cents: number | null
  intonation: Intonation | null
  /** Half-width of the meter in cents. */
  range?: number
}

export function CentsMeter({ cents, intonation, range = 50 }: Props) {
  const clamped = cents === null ? 0 : Math.max(-range, Math.min(range, cents))
  const x = 50 + (clamped / range) * 50 // percent

  return (
    <div className={`cents-meter ${intonation ?? 'silent'}`} aria-label="pitch deviation">
      <svg viewBox="0 0 100 20" preserveAspectRatio="none">
        <rect className="meter-track" x="0" y="8" width="100" height="4" rx="2" />
        <rect className="meter-zone" x="35" y="8" width="30" height="4" />
        <line className="meter-centre" x1="50" y1="2" x2="50" y2="18" />
        {cents !== null && <line className="meter-needle" x1={x} y1="0" x2={x} y2="20" />}
      </svg>
      <div className="meter-labels mono">
        <span>-{range}¢</span>
        <span>{cents === null ? '—' : `${cents > 0 ? '+' : ''}${cents.toFixed(0)}¢`}</span>
        <span>+{range}¢</span>
      </div>
    </div>
  )
}
