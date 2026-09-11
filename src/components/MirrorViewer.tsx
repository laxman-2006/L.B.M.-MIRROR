import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { SessionStatus, StatsState } from '../types'
import { defaultPeerService, type ChatMessage } from '../services/peerService'

type MirrorViewerProps = {
  stream?: MediaStream | null
  frameImage?: string | null
  label?: string
  deviceName: string
  status: SessionStatus
  quality: 'Low' | 'Balanced' | 'High'
  stats?: StatsState
  isUltraViewer?: boolean
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
  isUltraViewer = false,
  onFullscreen,
  onDisconnect,
  onReconnect,
  onQualityChange,
}: MirrorViewerProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)

  // Rotation: 0, 90, 180, 270 degrees
  const [rotation, setRotation] = useState<number>(0)
  // Audio state
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false)
  const [hasAudioTrack, setHasAudioTrack] = useState<boolean>(false)
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  // Stats HUD modal
  const [showStatsHud, setShowStatsHud] = useState<boolean>(false)

  // ─── UltraViewer Interactive State ─────────────────────────────────────────
  const [isControlActive, setIsControlActive] = useState<boolean>(isUltraViewer)
  const [showChatDrawer, setShowChatDrawer] = useState<boolean>(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState<string>('')
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [clipboardToast, setClipboardToast] = useState<string | null>(null)

  const lastMouseMoveRef = useRef<number>(0)

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

  // Listen to incoming chat and clipboard from partner
  useEffect(() => {
    defaultPeerService.setOnChatMessage((msg) => {
      setChatMessages((prev) => [...prev, msg])
      if (!showChatDrawer) {
        setUnreadCount((c) => c + 1)
      }
    })

    defaultPeerService.setOnClipboard((text) => {
      navigator.clipboard.writeText(text).catch(() => {})
      setClipboardToast(`📋 Remote text received: "${text.slice(0, 35)}..."`)
      setTimeout(() => setClipboardToast(null), 3500)
    })
  }, [showChatDrawer])

  // ─── Mouse Input Handlers for UltraViewer ──────────────────────────────────
  const getNormalizedCoordinates = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return null

    const rect = video.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    // Ensure click is within the video bounds
    const clientX = e.clientX
    const clientY = e.clientY

    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null
    }

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    return { normX, normY }
  }, [])

  const handleSurfaceMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isControlActive) return
    const now = performance.now()
    // Throttle to ~60 FPS (every 16ms)
    if (now - lastMouseMoveRef.current < 16) return
    lastMouseMoveRef.current = now

    const coords = getNormalizedCoordinates(e)
    if (!coords) return

    defaultPeerService.sendInputEvent({
      type: 'mouse:move',
      x: coords.normX,
      y: coords.normY,
    })
  }

  const handleSurfaceMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isControlActive) return
    const coords = getNormalizedCoordinates(e)
    if (!coords) return

    const btn = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left'
    defaultPeerService.sendInputEvent({
      type: 'mouse:down',
      button: btn,
      x: coords.normX,
      y: coords.normY,
    })
  }

  const handleSurfaceMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isControlActive) return
    const coords = getNormalizedCoordinates(e)
    if (!coords) return

    const btn = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left'
    defaultPeerService.sendInputEvent({
      type: 'mouse:up',
      button: btn,
      x: coords.normX,
      y: coords.normY,
    })
  }

  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isControlActive) return
    const coords = getNormalizedCoordinates(e)
    if (!coords) return

    defaultPeerService.sendInputEvent({
      type: 'mouse:click',
      button: 'left',
      x: coords.normX,
      y: coords.normY,
    })
  }

  const handleSurfaceDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isControlActive) return
    const coords = getNormalizedCoordinates(e)
    if (!coords) return

    defaultPeerService.sendInputEvent({
      type: 'mouse:dblclick',
      x: coords.normX,
      y: coords.normY,
    })
  }

  const handleSurfaceContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!isControlActive) return
    const coords = getNormalizedCoordinates(e)
    if (!coords) return

    defaultPeerService.sendInputEvent({
      type: 'mouse:click',
      button: 'right',
      x: coords.normX,
      y: coords.normY,
    })
  }

  const handleSurfaceWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isControlActive) return
    e.preventDefault()

    defaultPeerService.sendInputEvent({
      type: 'mouse:wheel',
      deltaY: e.deltaY,
    })
  }

  // ─── Keyboard Input Handlers for UltraViewer ───────────────────────────────
  const handleSurfaceKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isControlActive) return

    // Prevent default browser shortcuts when controlling remote desktop
    if (['Tab', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
      e.preventDefault()
    }

    defaultPeerService.sendInputEvent({
      type: 'key:down',
      code: e.code,
      key: e.key,
    })

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      defaultPeerService.sendInputEvent({
        type: 'key:text',
        text: e.key,
      })
    }
  }

  const handleSurfaceKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isControlActive) return
    defaultPeerService.sendInputEvent({
      type: 'key:up',
      code: e.code,
      key: e.key,
    })
  }

  // ─── Quick Action Shortcuts (UltraViewer Toolbar) ──────────────────────────
  const handleSendShortcut = (name: string) => {
    defaultPeerService.sendInputEvent({
      type: 'shortcut',
      name,
    })
    setClipboardToast(`⚡ Triggered remote: ${name}`)
    setTimeout(() => setClipboardToast(null), 2000)
  }

  const handleSyncClipboardToRemote = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        defaultPeerService.sendClipboard(text)
        setClipboardToast(`📋 Copied local clipboard to remote PC!`)
        setTimeout(() => setClipboardToast(null), 2500)
      }
    } catch {
      setClipboardToast('⚠️ Clipboard access permission denied in browser.')
      setTimeout(() => setClipboardToast(null), 2500)
    }
  }

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const msg: ChatMessage = {
      id: String(Date.now()),
      sender: 'me',
      senderName: 'Me',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setChatMessages((prev) => [...prev, msg])
    defaultPeerService.sendChatMessage(chatInput.trim())
    setChatInput('')
  }

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
      {/* ── Top UltraViewer Mirror Toolbar ────────────────────────────────── */}
      <div className="mirror-toolbar ultraviewer-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-device">{deviceName}</span>
          {label && <span className="toolbar-label">{label}</span>}
          <span className={`toolbar-status ${status === 'MIRRORING' ? 'mirroring' : ''}`}>
            ● {status === 'MIRRORING' ? 'LIVE (60 FPS)' : status}
          </span>
          {stats?.resolution && stats.resolution !== '—' && (
            <span className="toolbar-res-badge">{stats.resolution}</span>
          )}

          {/* UltraViewer Control State Toggle */}
          <button
            type="button"
            className={`toolbar-pill control-mode-pill ${isControlActive ? 'active-control' : ''}`}
            onClick={() => setIsControlActive((v) => !v)}
            title={isControlActive ? 'Remote control active (click to pause)' : 'Remote control paused (click to activate)'}
          >
            {isControlActive ? '🎮 Control Active' : '⏸️ View Only'}
          </button>
        </div>

        <div className="toolbar-actions">
          {/* Quick Action Shortcuts (UltraViewer standard features) */}
          <div className="quick-shortcuts-group" title="Send Windows Shortcut to Remote PC">
            <button
              type="button"
              className="toolbar-pill shortcut-pill"
              onClick={() => handleSendShortcut('WIN')}
              title="Open Remote Start Menu"
            >
              🪟 Win
            </button>
            <button
              type="button"
              className="toolbar-pill shortcut-pill"
              onClick={() => handleSendShortcut('ALTTAB')}
              title="Switch App (Alt+Tab)"
            >
              📑 Alt+Tab
            </button>
            <button
              type="button"
              className="toolbar-pill shortcut-pill"
              onClick={() => handleSendShortcut('TASKMGR')}
              title="Open Remote Task Manager"
            >
              📊 TaskMgr
            </button>
            <button
              type="button"
              className="toolbar-pill shortcut-pill"
              onClick={() => handleSendShortcut('EXPLORER')}
              title="Open Remote File Explorer (Win+E)"
            >
              📁 Explorer
            </button>
            <button
              type="button"
              className="toolbar-pill shortcut-pill"
              onClick={handleSyncClipboardToRemote}
              title="Sync local clipboard text to remote PC"
            >
              📋 Paste Clipboard
            </button>
          </div>

          {/* Live Chat Toggle */}
          <button
            type="button"
            className={`toolbar-pill chat-pill ${showChatDrawer ? 'active-hud' : ''}`}
            onClick={() => {
              setShowChatDrawer((v) => !v)
              setUnreadCount(0)
            }}
            title="Chat with remote partner"
          >
            💬 Chat {unreadCount > 0 && <span className="unread-bubble">{unreadCount}</span>}
          </button>

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
            title={hasAudioTrack ? (isAudioMuted ? 'Unmute Audio' : 'Mute Audio') : 'No audio in stream'}
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
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Work in full screen)'}
          >
            {isFullscreen ? '🗗 Exit Fullscreen' : '⛶ Fullscreen'}
          </button>

          {/* Reconnect button (if disconnected) */}
          {status === 'DISCONNECTED' && onReconnect && (
            <button
              type="button"
              className="toolbar-pill success-pill"
              onClick={onReconnect}
              title="Reconnect session"
            >
              🔄 Reconnect
            </button>
          )}

          {/* Disconnect Button */}
          <button
            type="button"
            className="toolbar-pill danger"
            onClick={onDisconnect}
            title="Disconnect remote session"
          >
            ✕ End Session
          </button>
        </div>
      </div>

      {/* Floating Clipboard Notification Banner */}
      {clipboardToast && (
        <div className="ultraviewer-toast-banner">
          <span>{clipboardToast}</span>
        </div>
      )}

      {/* ── Main Interactive Mirroring Surface ────────────────────────────── */}
      <div
        ref={surfaceRef}
        className={`mirror-surface ${isControlActive ? 'interactive-control-surface' : ''}`}
        tabIndex={0}
        onMouseMove={handleSurfaceMouseMove}
        onMouseDown={handleSurfaceMouseDown}
        onMouseUp={handleSurfaceMouseUp}
        onClick={handleSurfaceClick}
        onDoubleClick={handleSurfaceDoubleClick}
        onContextMenu={handleSurfaceContextMenu}
        onWheel={handleSurfaceWheel}
        onKeyDown={handleSurfaceKeyDown}
        onKeyUp={handleSurfaceKeyUp}
      >
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
              <h3>Connecting to Remote PC Screen…</h3>
              <p style={{ marginTop: '6px', color: '#94a3b8' }}>
                Establishing 60 FPS Remote Control stream over WebRTC.
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

        {/* ── UltraViewer Remote Chat Drawer ──────────────────────────────── */}
        {showChatDrawer && (
          <div className="ultraviewer-chat-drawer">
            <div className="chat-drawer-header">
              <div className="chat-title-group">
                <span>💬</span>
                <strong>Remote Chat</strong>
                <span className="chat-partner-tag">{deviceName}</span>
              </div>
              <button
                type="button"
                className="chat-close-btn"
                onClick={() => setShowChatDrawer(false)}
                title="Close chat"
              >
                ✕
              </button>
            </div>

            <div className="chat-messages-scroll">
              {chatMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <p>No messages yet. Send a message to the remote operator below!</p>
                </div>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className={`chat-bubble-row ${m.sender === 'me' ? 'me' : 'partner'}`}>
                    <div className="chat-bubble">
                      <span className="chat-author">{m.senderName}</span>
                      <p className="chat-text">{m.text}</p>
                      <span className="chat-time">{m.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="chat-input-form">
              <input
                type="text"
                placeholder="Type message to remote PC…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="chat-text-input"
              />
              <button type="submit" className="chat-send-btn" disabled={!chatInput.trim()}>
                Send
              </button>
            </form>
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
                <span className="metric-label">Control Mode</span>
                <span className="metric-val accent">{isControlActive ? 'Remote Control Active' : 'View Only'}</span>
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
                <span className="metric-label">Network</span>
                <span className="metric-val">{stats?.connectionType || 'WebRTC Global P2P'}</span>
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
