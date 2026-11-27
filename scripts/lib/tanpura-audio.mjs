// Shared audio analysis for tanpura recordings. Needs ffmpeg on PATH.
import { spawnSync } from 'node:child_process'
import { PitchDetector } from 'pitchy'

export const SR = 16000

export function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })
  if (r.status !== 0) throw new Error(r.stderr.toString())
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4)
}

export const cents = (a, b) => 1200 * Math.log2(a / b)

export function noteName(f) {
  const n = Math.round(12 * Math.log2(f / 440))
  const c = cents(f, 440) - n * 100
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return `${names[(((n + 9) % 12) + 12) % 12]}${4 + Math.floor((n + 9) / 12)} ${c >= 0 ? '+' : ''}${c.toFixed(0)}c`
}

/**
 * Measure madhya Sa. The strongest periodicity in a tanpura is usually the
 * mandra Sa string an octave below; `nominalHz` (if given) picks the octave,
 * otherwise anything under 110 Hz is assumed to be mandra and doubled.
 */
export function measureSa(pcm, nominalHz) {
  const det = PitchDetector.forFloat32Array(8192)
  const hits = []
  for (let s = 0; s + 8192 <= pcm.length; s += 4096) {
    const [f, c] = det.findPitch(pcm.subarray(s, s + 8192), SR)
    if (c > 0.8 && f > 40 && f < 400) hits.push(f)
  }
  if (!hits.length) return null
  hits.sort((a, b) => a - b)
  const median = hits[Math.floor(hits.length / 2)]
  let sa = median
  if (nominalHz) while (Math.abs(cents(sa, nominalHz)) > 600) sa *= sa < nominalHz ? 2 : 0.5
  else if (sa < 110) sa *= 2
  return { sa, median, windows: hits.length }
}

/** Folded-octave positions of the strings a tanpura may carry: Sa, Pa, Ma, Ni. */
export const STRING_CENTS = [0, 702, 498, 1088]

/**
 * Blocks (0.5 s) where many short-window pitch estimates fold away from every
 * string position: speech, handling noise or retuning. Returns merged segments.
 */
export function offStringSegments(pcm, saHz) {
  const det = PitchDetector.forFloat32Array(1024)
  const blocks = new Map()
  for (let s = 0; s + 1024 <= pcm.length; s += 256) {
    const [f, c] = det.findPitch(pcm.subarray(s, s + 1024), SR)
    if (c < 0.6 || f < 60 || f > 1000) continue
    const folded = ((cents(f, saHz) % 1200) + 1200) % 1200
    const dist = Math.min(...STRING_CENTS.map((p) => Math.min(Math.abs(folded - p), 1200 - Math.abs(folded - p))))
    const k = Math.floor(s / SR / 0.5)
    ;(blocks.get(k) ?? blocks.set(k, []).get(k)).push(dist)
  }
  const rows = [...blocks].sort((a, b) => a[0] - b[0]).map(([k, ds]) => ({ t: k / 2, n: ds.length, off: ds.filter((d) => d > 70).length / ds.length }))
  const flagged = rows.filter((x) => x.n >= 6 && x.off >= 0.4)
  const segments = []
  for (const x of flagged) {
    if (segments.length && x.t - segments.at(-1).end <= 0.6) segments.at(-1).end = x.t + 0.5
    else segments.push({ start: x.t, end: x.t + 0.5 })
  }
  return { segments, flagged: flagged.length, blocks: rows.length }
}
