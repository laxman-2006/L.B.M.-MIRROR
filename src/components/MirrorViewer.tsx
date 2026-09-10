import { useEffect, useRef, useState } from 'react'
import type { SessionStatus, StatsState } from '../types'

type MirrorViewerProps = {
  stream?: MediaStream | null
  frameImage?: string | null
  label?: string
  deviceName: string
  status: SessionStatus
  quality: 'Low' | 'Balanced' | 'High'
  stats?: StatsState
  onFullscreen?: () => void
  onDisconnect: () => void
  onReconnect?: () => void
  onQualityChange: (quality: 'Low' | 'Balanced' | 'High') => void
}

const QUALITY_LEVELS: Array<'Low' | 'Balanced' | 'High'> = ['Low', 'Balanced', 'High']

export function MirrorViewer({
  stream,
  frameImage,
  label,
  deviceName,
  status,
  quality,
  stats,
  onFullscreen,
  onDisconnect,
  onReconnect,
  onQualityChange,
}: MirrorViewerProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Rotation: 0, 90, 180, 270 degrees
  const [rotation, setRotation] = useState<number>(0)
  // Audio state
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false)
  const [hasAudioTrack, setHasAudioTrack] = useState<boolean>(false)
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  // Stats HUD modal
  const [showStatsHud, setShowStatsHud] = useState<boolean>(false)

  // Sync stream to video element and detect audio tracks
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null
    }

    if (stream) {
      const audioTracks = stream.getAudioTracks()
      setHasAudioTrack(audioTracks.length > 0)
      if (audioTracks.length > 0) {
        setIsAudioMuted(!audioTracks[0].enabled)
      }
    } else {
      setHasAudioTrack(false)
    }
  }, [stream])

  // Track native fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Rotate screen handler (90° increments)
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  // Audio mute/unmute handler
  const handleToggleAudio = () => {
    if (!stream) return
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) return

    const nextMuted = !isAudioMuted
    audioTracks.forEach((track) => {
      track.enabled = !nextMuted
    })
    if (videoRef.current) {
      videoRef.current.muted = nextMuted
    }
    setIsAudioMuted(nextMuted)
  }

  // Fullscreen toggle handler
  const handleToggleFullscreen = async () => {
    if (onFullscreen) {
      onFullscreen()
      return
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (shellRef.current) {
        await shellRef.current.requestFullscreen()
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err)
    }
  }

  // Rotation style helper
  const isRotatedSideways = rotation === 90 || rotation === 270
  const transformStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    maxWidth: isRotatedSideways ? '70vh' : '100%',
    maxHeight: isRotatedSideways ? '85vw' : '100%',
  }

  return (
    <div ref={shellRef} className={`mirror-shell ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* ── Top Mirror Toolbar ────────────────────────────────────────────── */}
      <div className="mirror-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-device">{deviceName}</span>
          {label && <span className="toolbar-label">{label}</span>}
          <span className={`toolbar-status ${status === 'MIRRORING' ? 'mirroring' : ''}`}>
            ● {status}
          </span>
          {stats?.resolution && stats.resolution !== '—' && (
            <span className="toolbar-res-badge">{stats.resolution}</span>
          )}
        </div>

        <div className="toolbar-actions">
          {/* Quality Switcher */}
          <div className="quality-group" role="group" aria-label="Stream quality">
            {QUALITY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                className={`toolbar-pill quality-pill ${quality === level ? 'active' : ''}`}
                onClick={() => onQualityChange(level)}
                aria-pressed={quality === level}
                title={`${level} Quality`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Rotate Button */}
          <button
            type="button"
            className="toolbar-pill"
            onClick={handleRotate}
            title={`Rotate 90° (Current: ${rotation}°)`}
          >
            ↺ Rotate {rotation > 0 ? `(${rotation}°)` : ''}
          </button>

          {/* Audio Button */}
          <button
            type="button"
            className={`toolbar-pill ${!hasAudioTrack ? 'disabled' : isAudioMuted ? 'muted' : 'active-audio'}`}
            onClick={handleToggleAudio}
            disabled={!hasAudioTrack}
            title={hasAudioTrack ? (isAudioMuted ? 'Unmute Audio' : 'Mute Audio') : 'Stream me audio track nahi hai'}
          >
            {!hasAudioTrack ? '🚫 No Audio' : isAudioMuted ? '🔇 Muted' : '🔊 Audio'}
          </button>

          {/* Live Stats HUD Toggle */}
          <button
            type="button"
            className={`toolbar-pill ${showStatsHud ? 'active-hud' : ''}`}
            onClick={() => setShowStatsHud((prev) => !prev)}
            title="Real-time WebRTC Stats"
          >
            📊 Stats
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="toolbar-pill"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? '🗗 Exit Fullscreen' : '⛶ Fullscreen'}
          </button>

          {/* Reconnect button (if disconnected) */}
          {status === 'DISCONNECTED' && onReconnect && (
            <button
              type="button"
              className="toolbar-pill success-pill"
              onClick={onReconnect}
              title="Session reconnect karein"
            >
              🔄 Reconnect
            </button>
          )}

          {/* Disconnect Button */}
          <button
            type="button"
            className="toolbar-pill danger"
            onClick={onDisconnect}
            title="Mirroring disconnect karein"
          >
            ✕ Disconnect
          </button>
        </div>
      </div>

      {/* ── Main Mirroring Surface ────────────────────────────────────────── */}
      <div className="mirror-surface">
        {frameImage ? (
          <img
            src={frameImage}
            alt="Android Screen"
            className="mirror-video"
            style={{
              objectFit: 'contain',
              ...transformStyle,
            }}
          />
        ) : stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isAudioMuted}
            className="mirror-video"
            style={transformStyle}
          />
        ) : (
          <div className="mirror-placeholder">
            <div className="placeholder-card">
              <div className="connecting-spinner" style={{ margin: '0 auto 16px' }} />
              <h3>Stream ka wait kar rahe hain…</h3>
              <p style={{ marginTop: '6px', color: '#94a3b8' }}>
                Screen capture permission accept karein ya device connect karein.
              </p>
              {onReconnect && (
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: '16px' }}
                  onClick={onReconnect}
                >
                  🔄 Retry Connection
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Floating Stats HUD Overlay ────────────────────────────────────── */}
        {showStatsHud && (
          <div className="stats-hud-overlay">
            <div className="stats-hud-header">
              <h4>Real-Time Stream Diagnostics</h4>
              <button
                type="button"
                className="hud-close-btn"
                onClick={() => setShowStatsHud(false)}
              >
                ✕
              </button>
            </div>
            <div className="stats-hud-grid">
              <div className="hud-metric">
                <span className="metric-label">Resolution</span>
                <span className="metric-val">{stats?.resolution || '—'}</span>
              </div>
              <div className="hud-metric">
                <span className="metric-label">Frame Rate (FPS)</span>
                <span className="metric-val accent">{stats?.fps || '—'}</span>
              </div>
              <div className="hud-metric">
                <span className="metric-label">Latency (RTT)</span>
                <span className="metric-val">{stats?.latency || '—'}</span>
              </div>
              <div className="hud-metric">
                <span className="metric-label">Bitrate</span>
                <span className="metric-val">{stats?.bitrate || '—'}</span>
              </div>
              <div className="hud-metric">
                <span className="metric-label">Packet Loss</span>
                <span className="metric-val">{stats?.packetLoss || '0.0%'}</span>
              </div>
              <div className="hud-metric">
                <span className="metric-label">Connection</span>
                <span className="metric-val">{stats?.connectionType || 'WebRTC'}</span>
              </div>
              <div className="hud-metric">
                <span className="metric-label">Audio Tracks</span>
                <span className="metric-val">{hasAudioTrack ? (isAudioMuted ? 'Muted' : 'Active') : 'None'}</span>
              </div>
              <div className="hud-metric">
                <span className="metric-label">Rotation</span>
                <span className="metric-val">{rotation}°</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
