// Check a tanpura recording before adding it to public/tanpura/.
//
//   node scripts/sample-check.mjs public/tanpura/file.mp3 [nominalSaHz]
//
// Reports the measured madhya Sa (to put in TANPURA_SAMPLES) and flags blocks
// where the detected pitch, folded to one octave, sits away from both Sa and
// Pa. A drone always folds onto Sa or Pa, so such blocks mean talking,
// handling noise or retuning, and the excerpt should be cut to avoid them.
// Needs ffmpeg on PATH; run from the repo root so pitchy resolves.
import { spawnSync } from 'node:child_process'
import { PitchDetector } from 'pitchy'

const [file, nominal] = process.argv.slice(2)
if (!file) {
  console.error('usage: node scripts/sample-check.mjs <audio file> [nominalSaHz]')
  process.exit(1)
}
const SR = 16000
const decode = () => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })
  if (r.status !== 0) throw new Error(r.stderr.toString())
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4)
}
const pcm = decode()
const cents = (a, b) => 1200 * Math.log2(a / b)
const noteName = (f) => {
  const n = Math.round(12 * Math.log2(f / 440))
  const c = cents(f, 440) - n * 100
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return `${names[(((n + 9) % 12) + 12) % 12]}${4 + Math.floor((n + 9) / 12)} ${c >= 0 ? '+' : ''}${c.toFixed(0)}c`
}

// 1. Measure Sa with long windows: the strongest cluster is usually mandra Sa.
const long = PitchDetector.forFloat32Array(8192)
const hits = []
for (let s = 0; s + 8192 <= pcm.length; s += 4096) {
  const [f, c] = long.findPitch(pcm.subarray(s, s + 8192), SR)
  if (c > 0.8 && f > 40 && f < 400) hits.push(f)
}
hits.sort((a, b) => a - b)
const med = hits[Math.floor(hits.length / 2)]
let sa = med
const nominalHz = Number(nominal)
if (nominalHz) while (Math.abs(cents(sa, nominalHz)) > 600) sa *= sa < nominalHz ? 2 : 0.5
else if (sa < 110) sa *= 2 // assume the detector locked onto the mandra string
console.log(`${file}`)
console.log(`  measured Sa: ${sa.toFixed(1)} Hz (${noteName(sa)}); detector median ${med.toFixed(2)} Hz over ${hits.length} windows`)

// 2. Off-string check with short windows.
const short = PitchDetector.forFloat32Array(1024)
const blocks = new Map()
for (let s = 0; s + 1024 <= pcm.length; s += 256) {
  const [f, c] = short.findPitch(pcm.subarray(s, s + 1024), SR)
  if (c < 0.6 || f < 60 || f > 1000) continue
  const folded = ((cents(f, sa) % 1200) + 1200) % 1200
  const dist = Math.min(folded, 1200 - folded, Math.abs(folded - 702))
  const k = Math.floor(s / SR / 0.5)
  ;(blocks.get(k) ?? blocks.set(k, []).get(k)).push(dist)
}
const rows = [...blocks].sort((a, b) => a[0] - b[0]).map(([k, ds]) => ({ t: k / 2, n: ds.length, off: ds.filter((d) => d > 70).length / ds.length }))
const flagged = rows.filter((x) => x.n >= 6 && x.off >= 0.4)
const segs = []
for (const x of flagged) {
  if (segs.length && x.t - segs.at(-1).end <= 0.6) segs.at(-1).end = x.t + 0.5
  else segs.push({ start: x.t, end: x.t + 0.5 })
}
console.log(`  off-string blocks: ${flagged.length} of ${rows.length}`)
for (const s of segs) console.log(`    suspicious ${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s (voice, handling or retuning?)`)
if (!segs.length) console.log('  no suspicious regions')
