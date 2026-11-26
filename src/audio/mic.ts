import type { CaptureMessage, CaptureProcessorOptions } from './worklets/capture-processor'
// `?worker&url` makes Vite compile the TypeScript worklet to a standalone ES
// module and hand back its URL, in both dev and production builds.
import captureProcessorUrl from './worklets/capture-processor.ts?worker&url'

export type FrameHandler = (frame: Float32Array, sampleRate: number, time: number) => void

export interface MicrophoneOptions extends CaptureProcessorOptions {
  /** Pass through to getUserMedia. Defaults disable browser DSP, which distorts pitch. */
  constraints?: MediaTrackConstraints
}

const DEFAULT_OPTIONS: MicrophoneOptions = {
  frameSize: 2048,
  hopSize: 512,
  constraints: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
}

/**
 * Opens the microphone and streams analysis frames via an AudioWorklet.
 * No audio is sent anywhere; the worklet output is muted and used only to
 * keep the node alive in the graph.
 */
export class MicrophoneInput {
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private worklet: AudioWorkletNode | null = null
  private sink: GainNode | null = null
  private static moduleLoaded = new WeakSet<AudioContext>()
  private readonly ctx: AudioContext
  private readonly options: MicrophoneOptions

  constructor(ctx: AudioContext, options: MicrophoneOptions = DEFAULT_OPTIONS) {
    this.ctx = ctx
    this.options = options
  }

  get running(): boolean {
    return this.worklet !== null
  }

  async start(onFrame: FrameHandler): Promise<void> {
    if (this.worklet) return

    if (!MicrophoneInput.moduleLoaded.has(this.ctx)) {
      await this.ctx.audioWorklet.addModule(captureProcessorUrl)
      MicrophoneInput.moduleLoaded.add(this.ctx)
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { ...DEFAULT_OPTIONS.constraints, ...this.options.constraints },
      video: false,
    })

    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.worklet = new AudioWorkletNode(this.ctx, 'capture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      processorOptions: {
        frameSize: this.options.frameSize,
        hopSize: this.options.hopSize,
      } satisfies CaptureProcessorOptions,
    })
    this.worklet.port.onmessage = (event: MessageEvent<CaptureMessage>) => {
      const msg = event.data
      if (msg.type === 'frame') onFrame(msg.frame, msg.sampleRate, msg.time)
    }

    // Muted sink so the worklet is pulled by the graph without feedback.
    this.sink = this.ctx.createGain()
    this.sink.gain.value = 0
    this.source.connect(this.worklet)
    this.worklet.connect(this.sink)
    this.sink.connect(this.ctx.destination)
  }

  stop(): void {
    this.worklet?.port.close()
    this.worklet?.disconnect()
    this.source?.disconnect()
    this.sink?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.worklet = null
    this.source = null
    this.sink = null
    this.stream = null
  }
}
