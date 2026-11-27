# Tanpura sample licences

All three recordings below are released under the Creative Commons CC0 1.0
Universal public domain dedication, which permits use, modification and
redistribution, commercial or not, without attribution. Credits are given
anyway as a courtesy. Each file here is a trimmed, loudness-normalised
excerpt of the Freesound HQ preview (MP3); the original lossless uploads
can be downloaded from the linked pages with a free Freesound account.

| File | Source | Author | Licence | Measured Sa | Excerpt |
| --- | --- | --- | --- | --- | --- |
| `tanpura-cs3-sankalp.mp3` | [Freesound #153262 "Tanpura 10"](https://freesound.org/s/153262/) | sankalp | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | C#3, 138.8 Hz | 0:09.5 to 0:47.5 of 2:13 |
| `tanpura-ds3-kaczinski.mp3` | [Freesound #506312 "Tambura_Eb_fat"](https://freesound.org/s/506312/) | Kaczinski | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | D#3, 155.4 Hz | 0:30 to 1:20 of 3:09 |
| `tanpura-e3-iluppai.mp3` | [Freesound #148850 "Tanpura in E"](https://freesound.org/s/148850/) | iluppai | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | E3 minus 30 cents, 161.9 Hz | 0:01.5 to end of 0:23 |

The C# source is a tuning demonstration with people talking from about
0:48 onwards; the excerpt is cut from the uninterrupted drone before that.
Every excerpt was checked with `scripts/sample-check.mjs`, which flags any
block whose pitch does not fold onto Sa or Pa (speech, handling, retuning).

Processing applied: trim, `loudnorm` to -20 LUFS integrated with -1.5 dBTP
peak, re-encode to MP3 160 kbps 44.1 kHz stereo. Sa was measured with the
app's own detector (Pitchy, McLeod pitch method) over the processed file.

Recordings considered and rejected, with reasons, are catalogued in
`docs/tanpura-samples-research.md`.
