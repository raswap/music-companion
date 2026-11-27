import type { MicrophoneDevice } from '../audio/mic'

interface Props {
  devices: readonly MicrophoneDevice[]
  deviceId: string
  activeDevice: string | null
  listening: boolean
  onChange: (deviceId: string) => void
}

/**
 * Lets the singer pick which input the app listens to. Browsers often default
 * to a virtual or loopback device (meeting tools, audio routers) rather than
 * the built-in microphone, which looks like "no input" in the app.
 */
export function MicSelector({ devices, deviceId, activeDevice, listening, onChange }: Props) {
  const known = devices.some((d) => d.deviceId === deviceId)
  return (
    <label className="mic-selector">
      Input device
      <select id="mic-device" value={known ? deviceId : ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Browser default{listening && activeDevice && !known ? ` (${activeDevice})` : ''}</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label}
          </option>
        ))}
      </select>
      {devices.length === 0 && (
        <span className="hint">Device names appear after you allow the microphone once.</span>
      )}
    </label>
  )
}
