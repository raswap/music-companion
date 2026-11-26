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
pitch-shifts it with `playbackRate`. Shifts beyond about ±3 semitones start
to sound artificial, so aim for three or four recordings spread across the
vocal range rather than one.

Guidelines for a seamless loop:

- Export a loop of at least 20 seconds containing several full pluck cycles.
- Trim so the loop boundary falls in the sustain, not on a pluck.
- OGG Vorbis or MP3 at 44.1 kHz or 48 kHz. Keep each file under ~2 MB.
- The player applies a 0.4 s crossfade at the boundary.

Licensing: PoC samples from Freesound must be checked per file. Prefer CC0;
CC-BY requires attribution in the app. Record `LICENSES.md` here listing the
source and licence of every file before shipping.

No samples are committed yet; the app falls back to a synthesized drone.
