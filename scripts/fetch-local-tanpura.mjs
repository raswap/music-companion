// Build a LOCAL, gitignored tanpura sample set for development listening.
//
//   node scripts/fetch-local-tanpura.mjs [sets.json]
//
// Downloads the first ~2 minutes of each recording listed in the sets file
// (default: scripts/local-tanpura-sets.json) with an HTTP range request, cuts
// a loudness-normalised excerpt, measures its Sa and writes
// public/tanpura/local/manifest.json, which the app loads at startup when
// present. Nothing under public/tanpura/local/ is committed: these recordings
// are for private development use only unless their authors grant a licence.
// Needs ffmpeg on PATH.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { decode, measureSa, noteName, offStringSegments } from './lib/tanpura-audio.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const setsFile = process.argv[2] ?? path.join(root, 'scripts/local-tanpura-sets.json')
const outDir = path.join(root, 'public/tanpura/local')
const cacheDir = path.join(root, '.cache/tanpura')
fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(cacheDir, { recursive: true })

const sets = JSON.parse(fs.readFileSync(setsFile, 'utf8'))
const BYTES = 6_000_000 // ~150 s of 320 kbps MP3
const START = 45 // skip the opening plucks and any fade-in
const LENGTH = 75

const manifest = []
for (const set of sets) {
  for (const item of set.items) {
    const name = `${set.id}-${item.key.toLowerCase().replace('#', 's')}${set.firstString === 'm' ? '-ma' : ''}`
    const raw = path.join(cacheDir, `${name}.part.mp3`)
    if (!fs.existsSync(raw)) {
      process.stdout.write(`downloading ${item.url} ... `)
      const res = await fetch(item.url, { headers: { Range: `bytes=0-${BYTES - 1}` } })
      if (!res.ok && res.status !== 206) {
        console.log(`HTTP ${res.status}, skipped`)
        continue
      }
      fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()))
      console.log('ok')
    }
    const out = path.join(outDir, `${name}.mp3`)
    const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(START), '-t', String(LENGTH), '-i', raw,
      '-af', 'loudnorm=I=-20:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '160k', out])
    if (ff.status !== 0) {
      console.log(`${name}: ffmpeg failed: ${ff.stderr}`)
      continue
    }
    const pcm = decode(out)
    const m = measureSa(pcm, item.nominalHz)
    if (!m) {
      console.log(`${name}: no stable pitch, skipped`)
      continue
    }
    const { segments } = offStringSegments(pcm, m.sa)
    console.log(`${name}: Sa ${m.sa.toFixed(1)} Hz (${noteName(m.sa)})${segments.length ? `  WARNING off-string at ${segments.map((s) => `${s.start}-${s.end}s`).join(', ')}` : ''}`)
    manifest.push({
      url: `/tanpura/local/${name}.mp3`,
      saHz: Number(m.sa.toFixed(1)),
      label: `${set.label} ${item.key}`,
      set: set.id,
      setLabel: set.label,
      firstString: set.firstString ?? 'P',
      source: item.url,
      attribution: set.attribution ?? '',
    })
  }
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`wrote ${manifest.length} samples to public/tanpura/local/manifest.json`)
