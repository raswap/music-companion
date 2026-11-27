import { describe, expect, it } from 'vitest'
import { NoteStabilizer } from './note-stabilizer'

describe('NoteStabilizer', () => {
  it('confirms a swara only after it is held for holdMs', () => {
    const s = new NoteStabilizer({ holdMs: 200 })
    expect(s.push('m', 0, 0)).toBeNull()
    expect(s.push('m', 0, 100)).toBeNull()
    expect(s.push('m', 0, 199)).toBeNull()
    const confirmed = s.push('m', 0, 200)
    expect(confirmed).toEqual({ swara: 'm', octave: 0, since: 0 })
    expect(s.current).toEqual(confirmed)
  })

  it('confirms each hold only once', () => {
    const s = new NoteStabilizer({ holdMs: 100 })
    s.push('P', 0, 0)
    expect(s.push('P', 0, 100)).not.toBeNull()
    expect(s.push('P', 0, 150)).toBeNull()
    expect(s.push('P', 0, 500)).toBeNull()
  })

  it('ignores brief passing notes (meend)', () => {
    const s = new NoteStabilizer({ holdMs: 200 })
    s.push('G', 0, 0)
    s.push('G', 0, 250) // Ga confirmed
    expect(s.push('m', 0, 260)).toBeNull() // glide through shuddh Ma
    expect(s.push('m', 0, 300)).toBeNull()
    expect(s.push('M', 0, 320)).toBeNull() // lands on tivra Ma
    expect(s.push('M', 0, 400)).toBeNull()
    expect(s.push('M', 0, 520)?.swara).toBe('M')
  })

  it('treats a change of octave as a new note', () => {
    const s = new NoteStabilizer({ holdMs: 100 })
    s.push('S', 0, 0)
    expect(s.push('S', 1, 50)).toBeNull()
    expect(s.push('S', 1, 100)).toBeNull()
    expect(s.push('S', 1, 150)?.octave).toBe(1)
  })

  it('resets on silence', () => {
    const s = new NoteStabilizer({ holdMs: 100 })
    s.push('R', 0, 0)
    s.push(null, 0, 50)
    expect(s.current).toBeNull()
    expect(s.push('R', 0, 60)).toBeNull()
    expect(s.push('R', 0, 120)).toBeNull()
    expect(s.push('R', 0, 160)).not.toBeNull()
  })
})
