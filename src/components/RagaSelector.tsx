import { RAGAS, type Raga } from '../music/ragas'

interface Props {
  raga: Raga
  onChange: (raga: Raga) => void
}

export function RagaSelector({ raga, onChange }: Props) {
  return (
    <label className="raga-selector">
      Raga
      <select
        id="raga"
        value={raga.id}
        onChange={(e) => {
          const next = RAGAS.find((r) => r.id === e.target.value)
          if (next) onChange(next)
        }}
      >
        {RAGAS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} · {r.thaat} thaat
          </option>
        ))}
      </select>
    </label>
  )
}
