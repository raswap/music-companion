import { useEffect, useRef } from 'react'
import { HISTORY_SECONDS, type PitchPoint } from '../hooks/usePitch'
import { isAllowed, type Raga } from '../music/ragas'
import { SWARAS } from '../music/swaras'

interface Props {
  history: readonly PitchPoint[]
  raga: Raga
  /** Lowest and highest cents from Sa to show. */
  minCents?: number
  maxCents?: number
}

/**
 * Canvas tape of the last few seconds of pitch. Horizontal lines mark swara
 * positions; raga swaras are brighter, varjit ones dimmer and dashed.
 */
export function PitchTape({ history, raga, minCents = -700, maxCents = 1500 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const style = getComputedStyle(canvas)
    const colourAllowed = style.getPropertyValue('--tape-allowed') || '#8a7a5a'
    const colourVarjit = style.getPropertyValue('--tape-varjit') || '#4a3a2a'
    const colourSa = style.getPropertyValue('--tape-sa') || '#d9b36a'
    const colourLine = style.getPropertyValue('--tape-line') || '#f2e6c9'

    const yFor = (cents: number) => height - ((cents - minCents) / (maxCents - minCents)) * height

    // Swara grid across the visible saptaks.
    ctx.lineWidth = 1
    ctx.font = '11px system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    for (let octave = -1; octave <= 1; octave++) {
      for (const swara of SWARAS) {
        const cents = swara.cents + octave * 1200
        if (cents < minCents || cents > maxCents) continue
        const y = yFor(cents)
        const allowed = isAllowed(raga, swara.id)
        ctx.strokeStyle = swara.id === 'S' ? colourSa : allowed ? colourAllowed : colourVarjit
        ctx.setLineDash(allowed ? [] : [3, 5])
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
        if (allowed) {
          ctx.fillStyle = ctx.strokeStyle
          ctx.fillText(swara.label, 4, y - 7)
        }
      }
    }
    ctx.setLineDash([])

    // Pitch line, newest at the right edge.
    if (history.length === 0) return
    const now = performance.now()
    const span = HISTORY_SECONDS * 1000
    const xFor = (time: number) => width - ((now - time) / span) * width

    ctx.strokeStyle = colourLine
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    let drawing = false
    ctx.beginPath()
    for (const point of history) {
      if (point.centsFromSa === null) {
        drawing = false
        continue
      }
      const x = xFor(point.time)
      const y = yFor(point.centsFromSa)
      if (!drawing) {
        ctx.moveTo(x, y)
        drawing = true
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }, [history, raga, minCents, maxCents])

  return <canvas ref={canvasRef} className="pitch-tape" aria-label="pitch history" />
}
