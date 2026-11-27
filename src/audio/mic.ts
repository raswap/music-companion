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
/** Turn a getUserMedia rejection into something a singer can act on. */
export function describeMicrophoneError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access was blocked. Allow the microphone for this site in the browser address bar, then try again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found. Check that one is connected and selected as the input device.'
    case 'NotReadableError':
      return 'The microphone is in use by another app or could not be opened. Close other apps using it and try again.'
    default:
      return `Could not open the microphone: ${err instanceof Error ? err.message : String(err)}`
  }
}

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

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error(
        'The microphone only works on a secure page. Open the app at http://localhost, or over https. ' +
          `This page was opened at ${window.location.origin}.`,
      )
    }
    if (!this.ctx.audioWorklet) {
      throw new Error('This browser does not support AudioWorklet, which the microphone capture needs.')
    }

    if (!MicrophoneInput.moduleLoaded.has(this.ctx)) {
      await this.ctx.audioWorklet.addModule(captureProcessorUrl)
      MicrophoneInput.moduleLoaded.add(this.ctx)
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { ...DEFAULT_OPTIONS.constraints, ...this.options.constraints },
        video: false,
      })
    } catch (err) {
      throw new Error(describeMicrophoneError(err))
    }

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
