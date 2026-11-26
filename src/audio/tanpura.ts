/**
 * Tanpura drone.
 *
 * Two playback paths:
 *  1. Sample mode: a recorded loop is played with a short equal-power crossfade
 *     between consecutive repetitions so there is no audible seam. The sample
 *     is pitch-shifted via playbackRate from its recorded Sa to the target Sa.
 *  2. Synth mode (fallback when no sample is available): four plucked strings
 *     are approximated with harmonic-rich periodic waves and staggered
 *     pluck envelopes. It is clearly artificial but good enough to practise with.
 */

export type FirstString = 'P' | 'm' | 'N'

export interface TanpuraSample {
  url: string
  /** Frequency of Sa as recorded in the sample. */
  saHz: number
}

export interface TanpuraOptions {
  saHz: number
  firstString: FirstString
  /** 0..1 */
  volume: number
  /** Optional recorded loop; synth fallback is used when absent or failing to load. */
  sample?: TanpuraSample
  /** Crossfade length in seconds for sample looping. */
  crossfadeSeconds?: number
}

/** Ratio of the first (leftmost) string relative to madhya Sa; all are mandra. */
const FIRST_STRING_RATIO: Record<FirstString, number> = {
  P: 3 / 4, // mandra Pa
  m: 2 / 3, // mandra Ma
  N: 15 / 16, // mandra Ni
}

export class Tanpura {
  private master: GainNode
  private voice: SampleLoop | SynthDrone | null = null
  private options: TanpuraOptions | null = null
  private readonly ctx: AudioContext

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)
  }

  get playing(): boolean {
    return this.voice !== null
  }

  get mode(): 'sample' | 'synth' | null {
    if (!this.voice) return null
    return this.voice instanceof SampleLoop ? 'sample' : 'synth'
  }

  async start(options: TanpuraOptions): Promise<void> {
    this.stop()
    this.options = options

    let voice: SampleLoop | SynthDrone | null = null
    if (options.sample) {
      try {
        const buffer = await loadAudioBuffer(this.ctx, options.sample.url)
        voice = new SampleLoop(this.ctx, buffer, options.saHz / options.sample.saHz, options.crossfadeSeconds ?? 0.4)
      } catch (err) {
        console.warn('Tanpura sample failed to load, falling back to synth', err)
      }
    }
    voice ??= new SynthDrone(this.ctx, options.saHz, FIRST_STRING_RATIO[options.firstString])

    voice.output.connect(this.master)
    voice.start()
    this.voice = voice
    this.fadeTo(options.volume, 0.5)
  }

  stop(): void {
    if (!this.voice) return
    const voice = this.voice
    this.voice = null
    this.fadeTo(0, 0.3)
    setTimeout(() => {
      voice.stop()
      voice.output.disconnect()
    }, 350)
  }

  setVolume(volume: number): void {
    if (this.options) this.options.volume = volume
    if (this.voice) this.fadeTo(volume, 0.05)
  }

  /** Changing Sa or the first string requires restarting the voice. */
  async update(patch: Partial<TanpuraOptions>): Promise<void> {
    if (!this.options) return
    const next = { ...this.options, ...patch }
    const needsRestart =
      next.saHz !== this.options.saHz ||
      next.firstString !== this.options.firstString ||
      next.sample?.url !== this.options.sample?.url
    this.options = next
    if (needsRestart && this.voice) await this.start(next)
    else this.setVolume(next.volume)
  }

  private fadeTo(value: number, seconds: number): void {
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(value, now + seconds)
  }
}

async function loadAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`)
  const data = await response.arrayBuffer()
  return ctx.decodeAudioData(data)
}

interface Voice {
  output: AudioNode
  start(): void
  stop(): void
}

/** Loops an AudioBuffer with equal-power crossfades between repetitions. */
class SampleLoop implements Voice {
  readonly output: GainNode
  private timer: number | null = null
  private nextStart = 0
  private active: Array<{ source: AudioBufferSourceNode; gain: GainNode; end: number }> = []
  private readonly ctx: AudioContext
  private readonly buffer: AudioBuffer
  private readonly playbackRate: number
  private readonly crossfade: number

  constructor(ctx: AudioContext, buffer: AudioBuffer, playbackRate: number, crossfade: number) {
    this.ctx = ctx
    this.buffer = buffer
    this.playbackRate = playbackRate
    this.crossfade = crossfade
    this.output = ctx.createGain()
  }

  start(): void {
    this.nextStart = this.ctx.currentTime + 0.05
    this.schedule()
    this.timer = window.setInterval(() => this.schedule(), 250)
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    for (const { source } of this.active) {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
    }
    this.active = []
  }

  /** Keep roughly one second of audio scheduled ahead of the clock. */
  private schedule(): void {
    const lookahead = 1.0
    const duration = this.buffer.duration / this.playbackRate
    while (this.nextStart < this.ctx.currentTime + lookahead) {
      this.playOnce(this.nextStart, duration)
      this.nextStart += duration - this.crossfade
    }
    this.active = this.active.filter((a) => a.end > this.ctx.currentTime)
  }

  private playOnce(at: number, duration: number): void {
    const source = this.ctx.createBufferSource()
    source.buffer = this.buffer
    source.playbackRate.value = this.playbackRate

    const gain = this.ctx.createGain()
    const fade = Math.min(this.crossfade, duration / 2)
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(1, at + fade)
    gain.gain.setValueAtTime(1, at + duration - fade)
    gain.gain.linearRampToValueAtTime(0, at + duration)

    source.connect(gain)
    gain.connect(this.output)
    source.start(at)
    source.stop(at + duration)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
    }
    this.active.push({ source, gain, end: at + duration })
  }
}

/** Synthesized stand-in for a tanpura: four strings, staggered plucks. */
class SynthDrone implements Voice {
  readonly output: GainNode
  private oscillators: OscillatorNode[] = []
  private envelopes: GainNode[] = []
  private timer: number | null = null
  private wave: PeriodicWave
  private readonly ctx: AudioContext
  private readonly saHz: number
  private readonly firstStringRatio: number

  constructor(ctx: AudioContext, saHz: number, firstStringRatio: number) {
    this.ctx = ctx
    this.saHz = saHz
    this.firstStringRatio = firstStringRatio
    this.output = ctx.createGain()
    this.output.gain.value = 0.25
    this.wave = SynthDrone.makeStringWave(ctx)
  }

  private static makeStringWave(ctx: AudioContext): PeriodicWave {
    const harmonics = 24
    const real = new Float32Array(harmonics + 1)
    const imag = new Float32Array(harmonics + 1)
    for (let n = 1; n <= harmonics; n++) {
      // Bright, slowly decaying spectrum approximating the jawari buzz.
      imag[n] = 1 / n ** 1.2
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false })
  }

  start(): void {
    // Strings in playing order: first string, Sa, Sa (jodi), Sa kharaj (mandra).
    const freqs = [this.saHz * this.firstStringRatio, this.saHz, this.saHz * 1.002, this.saHz / 2]
    const lowpass = this.ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = Math.min(6000, this.saHz * 24)
    lowpass.Q.value = 0.5
    lowpass.connect(this.output)

    for (const f of freqs) {
      const osc = this.ctx.createOscillator()
      osc.setPeriodicWave(this.wave)
      osc.frequency.value = f
      const env = this.ctx.createGain()
      env.gain.value = 0
      osc.connect(env)
      env.connect(lowpass)
      osc.start()
      this.oscillators.push(osc)
      this.envelopes.push(env)
    }

    this.pluckCycle()
    this.timer = window.setInterval(() => this.pluckCycle(), 4000)
  }

  /** One pass across the four strings, roughly a second apart, with long sustain. */
  private pluckCycle(): void {
    const now = this.ctx.currentTime
    this.envelopes.forEach((env, i) => {
      const t = now + i * 1.0 + 0.02
      env.gain.cancelScheduledValues(t)
      env.gain.setValueAtTime(env.gain.value, t)
      env.gain.linearRampToValueAtTime(1, t + 0.02)
      env.gain.setTargetAtTime(0.35, t + 0.05, 1.2)
    })
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    for (const osc of this.oscillators) {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
      osc.disconnect()
    }
    this.oscillators = []
    this.envelopes = []
  }
}
