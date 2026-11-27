# Tanpura sample research

Survey of freely available tanpura recordings that could be redistributed
inside the app, carried out November 2026. Goal: replace the synthesized
fallback drone with real recordings whose licence permits bundling in a
product, covering as much of the vocal Sa range as possible.

## Summary

- **Shipped:** three CC0 recordings from Freesound covering C#3, D#3 and E3
  (see `public/tanpura/LICENSES.md`). CC0 needs no attribution, so there is
  no licence text to show in the app.
- **Usable with attribution (CC BY 4.0), not shipped:** seven more Freesound
  recordings, mostly in C, C# and D#, including three long recordings of a
  Raagini electronic tanpura. They add no new keys, so they were left out to
  keep the app attribution-free.
- **Free to listen to but no licence, not usable:** Raga Junglism's two
  12-key sets and the Internet Archive "Tanpura Drone, 12 Pitches" set.
  Both would need written permission from the author before bundling.
- **Gap:** no open recording exists above E3. Female voices (G#3 to B3) are
  served by octave folding of the male recordings. A single recording around
  A3 would close the gap; recording one is the recommended next step.

## Sources searched

| Source | Method | Result |
| --- | --- | --- |
| Freesound | Site search for tanpura, tambura, tanpura drone; each candidate page read for licence, duration and description | 21 candidate sounds, 16 real tanpura drones |
| Raga Junglism | Tanpuras page | 26 MP3s, two 12-key sets plus low variants; "100% open-access and ad-free" but no licence |
| Internet Archive | Advanced search, audio mediatype, tanpura OR tambura | 409 items, nearly all concert recordings; one 12-key drone set, no licence |
| Wikimedia Commons | API search in the File namespace | 50 hits, all photographs; no audio |
| GitHub | Web search | `msrmptm/tanpura` has 12 WAVs, no licence; `olilarkin/tambura` is a FAUST physical model, not samples |

## Freesound candidates

Sa was measured on the HQ preview with autocorrelation and confirmed with
the app's own Pitchy detector where shipped. "Mandra" means the detector
locked onto the lowest string an octave below Sa, which is normal.

| ID | Title | Author | Licence | Length | Key (Sa) | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 153262 | Tanpura 10 | sankalp | CC0 | 2:13 | C#3 +6c | **Shipped.** Acoustic, continuous, bright. Recorded at Tapan music centre, Barcelona |
| 506312 | Tambura_Eb_fat | Kaczinski | CC0 | 3:09 | D#3 -1c | **Shipped.** Custom 8-string instrument, loud, darker tone, very steady |
| 148850 | Tanpura in E | iluppai | CC0 | 0:23 | E3 -30c | **Shipped.** Flat tanpura with 5th and 8th, quiet; normalised. Short loop |
| 153263 | Acoustic Tanpura 4 | sankalp | CC BY 4.0 | 0:38 | C#3 | Good, duplicate key of 153262 |
| 153267 | Acoustic Tanpura 7 | sankalp | CC BY 4.0 | 0:18 | C#3 | Short, duplicate key |
| 155274 | Acoustic Tanpura 12 | sankalp | CC BY 4.0 | 0:46 | D#3 +13c | Good acoustic (Dhrupad Sansar, IIT Bombay), duplicate key of 506312 |
| 342968 | Tanpura C# | iternetcone | CC BY 4.0 | 0:18 | C#3 +5c | Short, duplicate key |
| 155481 | Electronic Tanpura 11 | sankalp | CC BY 4.0 | 3:33 | C3 | Raagini electronic box; clean, but synthetic character |
| 155491 | Electronic Tanpura 2 | sankalp | CC BY 4.0 | 4:24 | C3 | Same |
| 155500 | Electronic Tanpura 3 | sankalp | CC BY 4.0 | 4:05 | C3 | Same |
| 194435 | Tanbura_96Khz24bit | psuess | CC0 | 1:22 | unstable | Pauses mid-file, pitch estimate wanders; not loopable as is |
| 416770, 416776 | Tanpura slow plucking, E minor | luckylittleraven | CC0 | 0:35 | B D G E | Strings tuned to a chord, not Sa-Pa; unusable as a drone |
| 416606, 416753, 416758, 416764 | Tanpura snippets | luckylittleraven | CC0 | 5 to 8 s | C#, Eb | Too short, non-standard tuning |
| 35476 | tanpura2 | marvman | CC0 | 0:06 | C | Too short |
| 562771 | TanB | adheesh7 | CC0 | 0:04 | ? | Recorded from the iTablaPro app; provenance unclear |
| 181947 | Tambura | deleted user | CC0 | 0:57 | ? | Sampler-generated, processed |
| 619263 | tanpura drone#3 | MieliTietty | CC0 | 1:01 | ? | Soundscape with effects |

Freesound originals (WAV or AIFF) need a free account to download; the
shipped files are cut from the 128 kbps HQ previews, which are the same
audio. Replacing them with the lossless originals is a drop-in change.

## Sources without a usable licence

**Raga Junglism** (George Howlett) offers Sa-Pa and Sa-ma sets in all 12
keys, 2020 "thick" recordings and 2021 "B5" recordings, as direct MP3
links. The page says the resources will "always remain 100% open-access and
ad-free" and invites listeners to "use them for singing, practicing", but
states no licence, so redistribution inside an app is not covered. These are
the richest-sounding free recordings found and the author is reachable via
the site; asking for permission is worthwhile.

**Internet Archive, "Tanpura Drone, 12 Pitches"** (Shashank Agrawal, 2016)
has one 60-minute MP3 per chromatic pitch. No licence field is set, so the
default is all rights reserved.

## Processing recipe used

```
ffmpeg -ss START -t 50 -i preview.mp3 \
  -af "loudnorm=I=-20:TP=-1.5:LRA=11" -ar 44100 -ac 2 \
  -c:a libmp3lame -b:a 160k out.mp3
```

Then measure Sa on the output with the app's detector and record it as
`saHz` in `src/hooks/useTanpura.ts`. The player crossfades 0.4 s at the loop
boundary, so cuts only need to avoid landing on a pluck.

## Recommendation

Ship the three CC0 recordings now. Record one tanpura around A3 for female
voices, and ideally one around G2 for low male voices, under the project's
own copyright; that removes the octave folding and gives a consistent
instrument across keys. If permission from Raga Junglism is obtained, its
two complete sets would supersede all of the above.
