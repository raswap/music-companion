/**
 * Shared AudioContext.
 *
 * Browsers only allow audio to start after a user gesture, and iOS Safari
 * additionally suspends contexts aggressively. Everything goes through this
 * single lazily-created context so that a tap on "Start" can resume it once.
 */
let context: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!context) {
    context = new AudioContext({ latencyHint: 'interactive' })
  }
  return context
}

/** Call from a user gesture handler before starting any audio. */
export async function ensureAudioRunning(): Promise<AudioContext> {
  const ctx = getAudioContext()
  if (ctx.state !== 'running') {
    await ctx.resume()
  }
  return ctx
}

export function isAudioSupported(): boolean {
  return typeof window !== 'undefined' && 'AudioContext' in window
}

export function isMicrophoneSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}
