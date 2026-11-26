# Music Companion

A browser-based practice companion for Hindustani classical vocal students.
It plays a tanpura drone at your chosen Sa, listens through the microphone,
detects the swara you are singing in real time, shows how far you are from
the ideal pitch in cents, and warns when you sing a note that is varjit
(forbidden) in the raga. The proof of concept supports raga Yaman.

See [docs/PRD.md](docs/PRD.md) for the full product requirements.

## Stack

- React 19, Vite, TypeScript
- Web Audio API with an AudioWorklet for microphone capture
- [Pitchy](https://github.com/ianprime0509/pitchy) (MIT) for pitch detection
- Vitest for unit tests, oxlint for linting

## Getting started

```bash
npm install
npm run dev
```

Open the printed URL in Chrome, Safari or Firefox. Press **Start listening**
and allow microphone access. Press **Play** under Tanpura for the drone.

Other scripts:

```bash
npm test          # unit tests
npm run typecheck # tsc
npm run lint      # oxlint
npm run build     # production build to dist/
```

## Project layout

```
src/
  audio/        Web Audio engine: context, mic capture worklet, pitch detector, tanpura
  music/        Pure music theory: swara ratios, Sa selection, raga rules, note stabilizer
  hooks/        React hooks wiring the audio engine into component state
  components/   UI: Sa selector, tanpura controls, swara display, cents meter, pitch tape
public/tanpura/ Recorded tanpura loops (none committed yet; synth fallback is used)
docs/           Product requirements
```

The `music/` folder has no browser dependencies and is fully unit tested.
Everything that touches `AudioContext` lives in `audio/` and `hooks/`.

## How swara detection works

1. The AudioWorklet in `src/audio/worklets/capture-processor.ts` slices the mic
   stream into 2048-sample frames every 512 samples (about 11 ms at 48 kHz).
2. `PitchDetector` runs Pitchy's McLeod pitch method on each frame and gates
   out silence, low-clarity frames and frequencies outside the vocal range.
3. `frequencyToSwara` converts the frequency to cents above Sa and snaps to the
   nearest just-intonation swara, returning the swara, saptak and deviation.
4. `classify` grades the reading as in tune, slightly off, off, or out of raga.
5. `NoteStabilizer` requires a swara to be held for 200 ms before an
   out-of-raga warning fires, so meend and gamak do not trigger false alarms.

## Privacy

All audio processing happens in the browser. Nothing is recorded or sent to
a server.
