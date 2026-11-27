# Music Companion App – Product Requirements Document (PoC)

## 1. Overview

A web-based practice companion for Hindustani classical vocal students. The app plays a realistic tanpura drone, listens to the singer through the microphone, detects swaras in real time, and gives instant feedback on pitch accuracy and raga rules. The first proof of concept (PoC) supports a single raga: Yaman.

## 2. Problem Statement

Students practise alone most of the time, without a guru to tell them when a swara is off-pitch or when they use a note that is forbidden (varjit) in the raga. Existing tanpura apps only provide a drone, and existing tuners are built for Western notes, not swaras relative to a chosen Sa.

## 3. Goals

- Provide a realistic tanpura drone at a user-selected Sa.
- Detect the sung swara in real time with low latency.
- Show how far the singer is from the ideal pitch, in cents.
- Warn when a note outside raga Yaman is sung.
- Feel as responsive as a live conversation (feedback within roughly 100 ms for pitch display).

## 4. Non-Goals (for the PoC)

- Automatic raga identification from free singing.
- Multiple ragas, bandish library, or lesson plans.
- Native iOS or Android apps.
- User accounts, payments, or cloud storage.
- Conversational AI voice companion (planned for a later phase).

## 5. Target Users

- Primary: intermediate Hindustani vocal students practising at home.
- Secondary: teachers who want students to practise between lessons.

## 6. User Stories

- As a singer, I choose my Sa (for example C#, D, E) so the tanpura and swara detection match my scale.
- As a singer, I hear a real-sounding tanpura loop that plays seamlessly.
- As a singer, I see which swara I am singing and whether I am sharp or flat.
- As a singer practising Yaman, I am alerted when I sing shuddh Ma instead of tivra Ma.
- As a singer, I can see a simple history of my pitch over the last few seconds.

## 7. Functional Requirements

### 7.1 Sa Selection

- Dropdown of base notes (A to G#) with fine tuning in cents.
- Optional mode: singer sings Sa and the app captures it as the base frequency.

### 7.2 Tanpura

- Pre-recorded real tanpura loops (MP3/OGG), one per base note, or pitch-shifted from one high-quality sample.
- Seamless looping using a short crossfade with Web Audio gain nodes.
- Volume control and Pa / Ma / Ni first-string option (Pa by default).

### 7.3 Swara Detection

- Microphone input via Web Audio API.
- Pitch detection using an open-source library (candidate: Dhwani, Pitchy or Pitchfinder).
- Map frequency to the nearest swara using just-intonation ratios relative to Sa.
- Output: swara name, octave (mandra, madhya, taar), deviation in cents.

### 7.4 Raga Rules – Yaman

- Allowed swaras: Sa, Re, Ga, tivra Ma, Pa, Dha, Ni (all shuddh except Ma).
- Flag shuddh Ma, komal Re, komal Ga, komal Dha and komal Ni as out-of-raga.
- Later: aroha/avaroha patterns and pakad recognition.

### 7.5 Feedback UI

- Large display of the current swara and a needle or bar for cents deviation.
- Colour coding: green in tune, amber slightly off, red out of raga.
- Scrolling pitch line (visual tape) for the last 10 seconds.

## 8. Non-Functional Requirements

- Latency: pitch display updates within about 100 ms.
- Runs in modern Chrome, Safari and Firefox on desktop and mobile.
- Works offline after first load (audio files cached).
- No audio leaves the device in the PoC (privacy by design).

## 9. Technical Approach

- Frontend: React with Vite, TypeScript.
- Audio: Web Audio API, AudioWorklet for low-latency processing.
- Pitch: open-source JS library; verify licence (prefer MIT or Apache 2.0, avoid GPL for a commercial product).
- Tanpura samples: Creative Commons samples from Freesound for the PoC; own studio recording later.
- Hosting: static hosting such as Vercel or Netlify.

## 10. Success Metrics

- Swara detection accuracy of at least 90% on test recordings of a trained singer.
- Tanpura loop with no audible seam.
- At least five students (for example from the guru's class) use it for a week and rate it useful.

## 11. Risks and Open Questions

- Background noise (traffic) reducing detection accuracy; consider noise gating.
- Meend and gamak may be misread as wrong notes; need tolerance windows.
- Licence of chosen pitch library must be confirmed before any commercial release.
- Quality and licence of free tanpura samples.

## 12. Future Phases

- Phase 2: more ragas (Bhupali, Bihag, Bhairav, Todi, Bageshree) and pakad detection.
- Phase 3: voice companion with streaming speech-to-text, LLM and text-to-speech for spoken feedback.
- Phase 4: mobile apps (React Native with native audio modules), teacher dashboard, subscriptions.
