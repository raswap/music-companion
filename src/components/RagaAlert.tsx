import type { Raga } from '../music/ragas'
import { SWARA_BY_ID, type SwaraId } from '../music/swaras'

interface Props {
  raga: Raga
  /** The varjit swara currently being held, if any. */
  varjitSwara: SwaraId | null
}

export function RagaAlert({ raga, varjitSwara }: Props) {
  if (!varjitSwara) {
    return (
      <div className="raga-alert ok" role="status">
        <strong>{raga.name}</strong> · {raga.description}
      </div>
    )
  }
  const hint = raga.hints[varjitSwara] ?? `${SWARA_BY_ID[varjitSwara].name} is not used in ${raga.name}.`
  return (
    <div className="raga-alert warn" role="alert">
      <strong>Out of raga:</strong> {hint}
    </div>
  )
}
