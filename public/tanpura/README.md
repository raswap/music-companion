# Tanpura samples

Drop recorded tanpura loops here and register them in `src/hooks/useTanpura.ts`
(`TANPURA_SAMPLES`). Each entry needs the file URL and the frequency of Sa as
recorded, for example:

```ts
export const TANPURA_SAMPLES = [
  { url: '/tanpura/c-sharp.ogg', saHz: 138.59 },
  { url: '/tanpura/g-sharp.ogg', saHz: 207.65 },
]
```

The player picks the sample whose recorded Sa is nearest the chosen Sa and
pitch-shifts it with `playbackRate`, folding by octaves so the shift never
exceeds six semitones (a tanpura an octave below the singer's Sa is still
the right drone). Shifts beyond about ±3 semitones start to sound
artificial, so aim for recordings spread across the vocal range. The
current set covers C#3, D#3 and E3; a recording around G#3 or A3 would
serve female voices without any octave folding.

Guidelines for a seamless loop:

- Export a loop of at least 20 seconds containing several full pluck cycles.
- Trim so the loop boundary falls in the sustain, not on a pluck.
- OGG Vorbis or MP3 at 44.1 kHz or 48 kHz. Keep each file under ~2 MB.
- The player applies a 0.4 s crossfade at the boundary.

Licensing: PoC samples from Freesound must be checked per file. Prefer CC0;
CC-BY requires attribution in the app. Record `LICENSES.md` here listing the
source and licence of every file before shipping.

Three CC0 recordings are committed; see `LICENSES.md` for sources. The app
falls back to the synthesized drone only if a sample fails to load.
