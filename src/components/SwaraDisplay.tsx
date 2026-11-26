import type { Intonation } from '../music/ragas'
import type { SwaraReading } from '../music/swaras'

interface Props {
  reading: SwaraReading | null
  intonation: Intonation | null
}

const SAPTAK_LABEL: Record<SwaraReading['saptak'], string> = {
  'ati-mandra': 'ati mandra',
  mandra: 'mandra',
  madhya: 'madhya',
  taar: 'taar',
  'ati-taar': 'ati taar',
}

export function SwaraDisplay({ reading, intonation }: Props) {
  return (
    <div className={`swara-display ${intonation ?? 'silent'}`} role="status" aria-live="polite">
      <div className="swara-name">{reading ? reading.swara.label : '·'}</div>
      <div className="swara-meta">
        {reading ? (
          <>
            <span>{reading.swara.name}</span>
            <span>{SAPTAK_LABEL[reading.saptak]}</span>
            <span className="mono">{reading.frequency.toFixed(1)} Hz</span>
          </>
        ) : (
          <span>listening for a sustained note</span>
        )}
      </div>
    </div>
  )
}
