// Check a tanpura recording before adding it to public/tanpura/.
//
//   node scripts/sample-check.mjs <audio file> [nominalSaHz]
//
// Prints the measured madhya Sa (to put in the sample registry) and flags
// blocks where the detected pitch, folded to one octave, sits away from every
// string position (Sa, Pa, Ma, Ni). A drone always folds onto a string, so such
// blocks mean talking, handling noise or retuning; cut the excerpt around them.
import { decode, measureSa, noteName, offStringSegments } from './lib/tanpura-audio.mjs'

const [file, nominal] = process.argv.slice(2)
if (!file) {
  console.error('usage: node scripts/sample-check.mjs <audio file> [nominalSaHz]')
  process.exit(1)
}
const pcm = decode(file)
const m = measureSa(pcm, Number(nominal) || undefined)
console.log(file)
if (!m) {
  console.log('  no stable pitch found')
  process.exit(2)
}
console.log(`  measured Sa: ${m.sa.toFixed(1)} Hz (${noteName(m.sa)}); detector median ${m.median.toFixed(2)} Hz over ${m.windows} windows`)
const { segments, flagged, blocks } = offStringSegments(pcm, m.sa)
console.log(`  off-string blocks: ${flagged} of ${blocks}`)
for (const s of segments) console.log(`    suspicious ${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s (voice, handling or retuning?)`)
if (!segments.length) console.log('  no suspicious regions')
