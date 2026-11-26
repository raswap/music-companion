/**
 * AudioWorklet that slices the microphone stream into overlapping analysis
 * frames and posts them to the main thread.
 *
 * Pitch detection itself runs on the main thread (Pitchy is cheap at 2048
 * samples), so the worklet only has to do buffering. Running the capture in a
 * worklet keeps the hop timing steady regardless of main-thread jank.
 */
export interface CaptureProcessorOptions {
  /** Samples per analysis frame. Larger = better low-pitch accuracy, more latency. */
  frameSize: number
  /** Samples between consecutive frames. Smaller = more frequent updates. */
  hopSize: number
}

export interface CaptureMessage {
  type: 'frame'
  frame: Float32Array
  sampleRate: number
  /** Seconds, in the AudioContext clock, of the last sample in the frame. */
  time: number
}

class CaptureProcessor extends AudioWorkletProcessor {
  private readonly frameSize: number
  private readonly hopSize: number
  private readonly ring: Float32Array
  private writeIndex = 0
  private filled = 0
  private sinceLastPost = 0
  private samplesSeen = 0

  constructor(options?: AudioWorkletNodeOptions) {
    super()
    const opts = (options?.processorOptions ?? {}) as Partial<CaptureProcessorOptions>
    this.frameSize = opts.frameSize ?? 2048
    this.hopSize = opts.hopSize ?? 512
    this.ring = new Float32Array(this.frameSize)
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0]
    if (!channel) return true

    for (let i = 0; i < channel.length; i++) {
      this.ring[this.writeIndex] = channel[i]
      this.writeIndex = (this.writeIndex + 1) % this.frameSize
      if (this.filled < this.frameSize) this.filled++
      this.sinceLastPost++
      this.samplesSeen++

      if (this.filled === this.frameSize && this.sinceLastPost >= this.hopSize) {
        this.sinceLastPost = 0
        this.postFrame()
      }
    }
    return true
  }

  private postFrame(): void {
    // Unroll the ring buffer into chronological order.
    const frame = new Float32Array(this.frameSize)
    const head = this.frameSize - this.writeIndex
    frame.set(this.ring.subarray(this.writeIndex), 0)
    frame.set(this.ring.subarray(0, this.writeIndex), head)

    const message: CaptureMessage = {
      type: 'frame',
      frame,
      sampleRate,
      time: this.samplesSeen / sampleRate,
    }
    this.port.postMessage(message, [frame.buffer])
  }
}

registerProcessor('capture-processor', CaptureProcessor)
