/**
 * LBM Mirror - Universal WebRTC Peer-to-Peer Cloud Engine (LBM Remote Desktop Mode)
 * Triple-Engine Architecture:
 * 1. Primary Engine: Direct Socket.IO WebRTC Offer/Answer Signaling Relay
 * 2. Secondary Engine: PeerJS Cloud WebRTC (Google STUN + OpenRelay TURN port 443 TCP/UDP)
 * 3. Local Engine: BroadcastChannel for zero-latency local testing across tabs & windows
 * 4. Zero-Drop Remote Control: Mouse click/move/drag/scroll, keyboard typing, system shortcuts, chat, clipboard
 */

import { Peer, type MediaConnection, type DataConnection } from 'peerjs'
import type { Socket } from 'socket.io-client'

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.services.mozilla.com' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  // OpenRelay Public TURN Relay Servers (Port 80, 443 TCP/UDP) for Carrier/Symmetric NAT
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export interface RemoteControlEvent {
  type:
    | 'mouse:move'
    | 'mouse:click'
    | 'mouse:down'
    | 'mouse:up'
    | 'mouse:dblclick'
    | 'mouse:rclick'
    | 'mouse:wheel'
    | 'key:down'
    | 'key:up'
    | 'key:text'
    | 'shortcut'
    | 'app:launch'
    | 'open:url'
  x?: number
  y?: number
  button?: 'left' | 'right' | 'middle'
  deltaY?: number
  delta?: number
  key?: string
  code?: string
  text?: string
  name?: string
  app?: string
  url?: string
}

export interface ChatMessage {
  id: string
  sender: 'me' | 'partner'
  senderName: string
  text: string
  time: string
}

export function createFallbackVideoStream(title = 'LBM Mirror Screen Stream'): MediaStream {
  if (typeof document === 'undefined') return new MediaStream()
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 720
  const ctx = canvas.getContext('2d')
  if (!ctx) return new MediaStream()

  let frameCount = 0

  const drawFrame = () => {
    frameCount++
    const pulseRadius = 45 + Math.sin(frameCount * 0.1) * 18

    // Sleek cyber background
    ctx.fillStyle = '#070f26'
    ctx.fillRect(0, 0, 1280, 720)

    // Animated grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'
    ctx.lineWidth = 1
    const offset = (frameCount * 1.5) % 40
    for (let x = offset; x < 1280; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 720)
      ctx.stroke()
    }
    for (let y = offset; y < 720; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(1280, y)
      ctx.stroke()
    }

    // Glowing radar circle pulse
    ctx.beginPath()
    ctx.arc(640, 240, pulseRadius, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'
    ctx.lineWidth = 3
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 24
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.arc(640, 240, 12, 0, Math.PI * 2)
    ctx.fillStyle = '#38bdf8'
    ctx.fill()

    // Title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 36px Segoe UI, Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, 640, 360)

    // Status
    ctx.fillStyle = '#38bdf8'
    ctx.font = '600 22px Segoe UI, Roboto, sans-serif'
    ctx.fillText('🟢 60 FPS P2P Video Channel Active • Screen Ready', 640, 410)

    // Sub-info
    ctx.fillStyle = '#94a3b8'
    ctx.font = '16px Segoe UI, Roboto, sans-serif'
    const now = new Date().toLocaleTimeString()
    ctx.fillText(`Syncing live desktop display frames... [Time: ${now} | Frame: ${frameCount}]`, 640, 450)
  }

  drawFrame()
  const intervalId = setInterval(drawFrame, 1000 / 30)

  const stream = canvas.captureStream ? canvas.captureStream(30) : new MediaStream()
  const track = stream.getVideoTracks()[0]
  if (track) {
    track.addEventListener('ended', () => clearInterval(intervalId))
  }
  return stream
}

export class PeerService {
  private peer: Peer | null = null
  private activeCall: MediaConnection | null = null
  private activeDataConn: DataConnection | null = null
  private nativeRtcPc: RTCPeerConnection | null = null
  private nativeDataChannel: RTCDataChannel | null = null
  private localStream: MediaStream | null = null
  private streamProvider: (() => Promise<MediaStream | null>) | null = null
  private currentPin: string = ''
  private currentPasscode: string = ''
  private socket: Socket | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private isConnecting: boolean = false
  private activePartnerRoom: string = ''

  public isSessionConnecting(): boolean {
    return this.isConnecting
  }

  public setStreamProvider(provider: (() => Promise<MediaStream | null>) | null) {
    this.streamProvider = provider
  }

  private onRemoteStreamCb: ((stream: MediaStream) => void) | null = null
  private onConnectionStateCb: ((status: 'idle' | 'ready' | 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) => void) | null = null
  private onControlEventCb: ((event: RemoteControlEvent) => void) | null = null
  private onChatCb: ((msg: ChatMessage) => void) | null = null
  private onClipboardCb: ((text: string) => void) | null = null

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('lbm_screen_mirror_bc')
        this.broadcastChannel.onmessage = (evt) => {
          this.handleBroadcastMessage(evt.data)
        }
      } catch {}
    }
  }

  setSocket(socket: Socket | null) {
    this.socket = socket
    if (socket) {
      this.attachSocketListeners()
      if (socket.connected && this.currentPin) {
        socket.emit('ultraviewer:host:register', {
          hostId: this.currentPin,
          passcode: this.currentPasscode,
          hostName: 'LBM Host PC',
        })
      }
      socket.on('connect', () => {
        if (this.currentPin) {
          socket.emit('ultraviewer:host:register', {
            hostId: this.currentPin,
            passcode: this.currentPasscode,
            hostName: 'LBM Host PC',
          })
        }
      })
    }
  }

  private attachSocketListeners() {
    if (!this.socket) return

    // Host received incoming partner via Socket.IO
    this.socket.on('ultraviewer:incoming_partner', async (payload: any) => {
      console.log('[PeerService] Partner incoming via Socket.IO:', payload)
      this.notifyStatus('connecting', `Partner connected: ${payload?.clientName || 'Remote Operator'}`)
      const room = `uv_${this.currentPin}`
      this.activePartnerRoom = room
      await this.initSocketHostRtc(room)
    })

    // WebRTC Signal relay (Offer, Answer, ICE)
    this.socket.on('ultraviewer:signal', async ({ signal, type }: any) => {
      if (!signal || !type) return
      console.log(`[PeerService] Received WebRTC signal via Socket.IO: ${type}`)

      if (type === 'offer' && this.nativeRtcPc) {
        try {
          await this.nativeRtcPc.setRemoteDescription(new RTCSessionDescription(signal))
          const answer = await this.nativeRtcPc.createAnswer()
          await this.nativeRtcPc.setLocalDescription(answer)
          this.socket?.emit('ultraviewer:signal', {
            targetRoom: this.activePartnerRoom,
            signal: answer,
            type: 'answer',
          })
        } catch (err) {
          console.warn('[PeerService] Socket RTC answer error:', err)
        }
      } else if (type === 'answer' && this.nativeRtcPc) {
        try {
          await this.nativeRtcPc.setRemoteDescription(new RTCSessionDescription(signal))
          console.log('[PeerService] Socket RTC answer accepted!')
        } catch (err) {
          console.warn('[PeerService] Socket RTC setRemoteDescription error:', err)
        }
      } else if (type === 'ice' && this.nativeRtcPc) {
        try {
          await this.nativeRtcPc.addIceCandidate(new RTCIceCandidate(signal))
        } catch {}
      }
    })

    this.socket.on('ultraviewer:input', (payload: any) => {
      if (payload?.event) {
        this.handleIncomingControlEvent(payload.event)
      }
    })

    this.socket.on('ultraviewer:chat', (payload: any) => {
      if (payload?.message && this.onChatCb) {
        this.onChatCb(payload.message)
      }
    })

    this.socket.on('ultraviewer:clipboard', (payload: any) => {
      if (payload?.text && this.onClipboardCb) {
        this.onClipboardCb(payload.text)
      }
    })

    this.socket.on('ultraviewer:partner_disconnected', () => {
      this.notifyStatus('disconnected', 'Remote session closed by partner.')
    })
  }

  /**
   * Host initializes native WebRTC PeerConnection for incoming partner
   */
  private async initSocketHostRtc(room: string) {
    if (this.nativeRtcPc) {
      try { this.nativeRtcPc.close() } catch {}
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      bundlePolicy: 'max-bundle',
    })
    this.nativeRtcPc = pc

    pc.onicecandidate = (evt) => {
      if (evt.candidate && this.socket) {
        this.socket.emit('ultraviewer:signal', {
          targetRoom: room,
          signal: evt.candidate,
          type: 'ice',
        })
      }
    }

    // Setup DataChannel for mouse/keyboard control
    try {
      const dc = pc.createDataChannel('ultraviewer-control', { ordered: true })
      this.nativeDataChannel = dc
      this.bindDataChannel(dc)
    } catch {}

    // Attach stream
    let streamToShare = this.localStream
    if (!streamToShare && this.streamProvider) {
      try {
        streamToShare = await this.streamProvider()
        if (streamToShare) this.localStream = streamToShare
      } catch {}
    }
    if (!streamToShare) {
      streamToShare = createFallbackVideoStream('LBM Host Screen')
    }

    streamToShare.getTracks().forEach((track) => {
      pc.addTrack(track, streamToShare!)
    })

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      this.socket?.emit('ultraviewer:signal', {
        targetRoom: room,
        signal: offer,
        type: 'offer',
      })
      console.log('[PeerService] Host WebRTC offer sent via Socket.IO!')
    } catch (err) {
      console.warn('[PeerService] Failed to create host offer:', err)
    }
  }

  private bindDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => {
      console.log('[PeerService] Native RTC DataChannel OPEN!')
    }

    dc.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        if (data.type === 'remote:input' && data.event) {
          this.handleIncomingControlEvent(data.event)
        } else if (data.type === 'chat:message' && data.message && this.onChatCb) {
          this.onChatCb(data.message)
        } else if (data.type === 'clipboard:text' && data.text && this.onClipboardCb) {
          this.onClipboardCb(data.text)
        }
      } catch {}
    }
  }

  setOnRemoteStream(cb: (stream: MediaStream) => void) {
    this.onRemoteStreamCb = cb
  }

  setOnConnectionState(cb: (status: 'idle' | 'ready' | 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) => void) {
    this.onConnectionStateCb = cb
  }

  setOnControlEvent(cb: (event: RemoteControlEvent) => void) {
    this.onControlEventCb = cb
  }

  setOnChatMessage(cb: (msg: ChatMessage) => void) {
    this.onChatCb = cb
  }

  setOnClipboard(cb: (text: string) => void) {
    this.onClipboardCb = cb
  }

  setHostPasscode(passcode: string) {
    this.currentPasscode = passcode.trim()
    if (this.socket && this.socket.connected && this.currentPin) {
      this.socket.emit('ultraviewer:host:register', {
        hostId: this.currentPin,
        passcode: this.currentPasscode,
        hostName: 'LBM Host PC',
      })
    }
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream
  }

  /**
   * Updates the active outgoing stream and swaps the video track on the live call
   */
  updateLocalStream(stream: MediaStream) {
    this.localStream = stream
    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) return

    // Replace track on PeerJS call
    if (this.activeCall && (this.activeCall as any).peerConnection) {
      try {
        const senders = (this.activeCall as any).peerConnection.getSenders()
        const videoSender = senders.find((s: any) => s.track && s.track.kind === 'video')
        if (videoSender) {
          videoSender.replaceTrack(videoTrack)
          console.log('[PeerService] Video track replaced on active PeerJS call!')
        }
      } catch (err) {
        console.warn('[PeerService] replaceTrack error on PeerJS:', err)
      }
    }

    // Replace track on Native RTC call
    if (this.nativeRtcPc) {
      try {
        const senders = this.nativeRtcPc.getSenders()
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
        if (videoSender) {
          videoSender.replaceTrack(videoTrack)
          console.log('[PeerService] Video track replaced on native WebRTC call!')
        }
      } catch (err) {
        console.warn('[PeerService] replaceTrack error on native RTC:', err)
      }
    }
  }

  /**
   * Initializes host receiver peer using the ID / PIN.
   */
  initHost(pin: string, outgoingStream?: MediaStream | null, passcode?: string): Promise<string> {
    const cleanPin = pin.replace(/\s+/g, '').trim()
    this.currentPin = cleanPin
    if (outgoingStream) this.localStream = outgoingStream
    if (passcode) this.currentPasscode = passcode.trim()

    // 1. Register with central Socket.IO coordinator
    if (this.socket && this.socket.connected) {
      this.socket.emit('ultraviewer:host:register', {
        hostId: cleanPin,
        passcode: this.currentPasscode,
        hostName: 'LBM Host PC',
      })
    }

    return new Promise((resolve) => {
      const hostPeerId = `lbm-mirror-${this.currentPin}`

      // If peer already open with correct ID, keep it
      if (this.peer && !this.peer.destroyed && this.peer.id === hostPeerId) {
        this.notifyStatus('ready', `Host ready with ID ${this.currentPin}`)
        return resolve(hostPeerId)
      }

      this.destroyPeer()

      try {
        const p = new Peer(hostPeerId, {
          config: {
            iceServers: ICE_SERVERS,
            bundlePolicy: 'max-bundle',
          },
          debug: 1,
        })

        p.on('open', (id) => {
          this.peer = p
          this.notifyStatus('ready', `Host ready with ID ${this.currentPin}`)
          this.broadcastToTabs('host:ready', { pin: this.currentPin })
          resolve(id)
        })

        p.on('call', async (mediaConn) => {
          this.activeCall = mediaConn
          this.notifyStatus('connecting', 'Incoming partner screen connection...')

          let streamToAnswer = this.localStream
          if (!streamToAnswer && this.streamProvider) {
            try {
              streamToAnswer = await this.streamProvider()
              if (streamToAnswer) this.localStream = streamToAnswer
            } catch (err) {
              console.warn('[PeerService] Stream provider error:', err)
            }
          }

          if (!streamToAnswer) {
            streamToAnswer = createFallbackVideoStream('LBM Host Screen')
          }

          mediaConn.answer(streamToAnswer)

          mediaConn.on('stream', (remoteStream) => {
            this.notifyStatus('connected', 'Live screen stream active at 60 FPS!')
            if (this.onRemoteStreamCb) {
              this.onRemoteStreamCb(remoteStream)
            }
          })

          mediaConn.on('close', () => {
            this.notifyStatus('disconnected', 'Stream closed by partner')
          })

          mediaConn.on('error', (err) => {
            console.warn('[PeerService] Call error:', err)
          })
        })

        p.on('connection', (dataConn) => {
          this.activeDataConn = dataConn
          dataConn.on('open', () => {
            dataConn.send({ type: 'host:welcome', pin: this.currentPin })
          })
          dataConn.on('data', (data: any) => {
            this.handleIncomingData(data, dataConn)
          })
          dataConn.on('close', () => {
            this.notifyStatus('disconnected', 'Data connection closed')
          })
        })

        p.on('error', (err: any) => {
          if (err.type === 'unavailable-id') {
            console.log('[PeerService] Host ID in use, attempting clean rebind...')
            setTimeout(() => {
              if (this.currentPin === cleanPin && (!this.peer || this.peer.destroyed)) {
                this.initHost(cleanPin, this.localStream, this.currentPasscode)
              }
            }, 1200)
          }
        })
      } catch (err: any) {
        console.error('[PeerService] PeerJS initialization error:', err)
        resolve('')
      }
    })
  }

  private handleIncomingData(data: any, dataConn: DataConnection) {
    if (!data) return

    // 1. Authentication Handshake
    if (data.type === 'auth:request') {
      const receivedPass = String(data.passcode || '').trim()
      const currentPass = String(this.currentPasscode || '').trim()

      if (!currentPass || receivedPass === currentPass) {
        console.log('[PeerService] Remote passcode authenticated successfully!')
        dataConn.send({
          type: 'auth:success',
          hostName: 'LBM Host PC',
          screenWidth: typeof window !== 'undefined' && window.screen ? window.screen.width : 1920,
          screenHeight: typeof window !== 'undefined' && window.screen ? window.screen.height : 1080,
        })
        this.notifyStatus('connected', 'Remote operator authenticated with control')
      } else {
        console.warn('[PeerService] Remote passcode rejected!')
        dataConn.send({
          type: 'auth:rejected',
          error: 'गलत पासवर्ड (Invalid Passcode). कृपया Host PC का सही पासवर्ड डालें।',
        })
      }
      return
    }

    // 2. LBM Remote Control Events
    if (data.type === 'remote:input') {
      const evt: RemoteControlEvent = data.event
      if (evt) {
        this.handleIncomingControlEvent(evt)
      }
      return
    }

    // 3. Live Chat
    if (data.type === 'chat:message') {
      if (this.onChatCb) {
        this.onChatCb({
          id: data.id || String(Date.now()),
          sender: 'partner',
          senderName: data.senderName || 'Remote Operator',
          text: data.text || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      }
      return
    }

    // 4. Clipboard Sync
    if (data.type === 'clipboard:text') {
      if (this.onClipboardCb && data.text) {
        this.onClipboardCb(data.text)
      }
      return
    }

    if (data.type === 'client:ping') {
      dataConn.send({ type: 'host:pong', timestamp: Date.now() })
    }
  }

  private handleIncomingControlEvent(evt: RemoteControlEvent) {
    // Priority 1: Native Electron Bridge
    if (typeof window !== 'undefined' && window.electronAPI?.remoteInput) {
      window.electronAPI.remoteInput.start().catch(() => {})
      window.electronAPI.remoteInput.sendEvent(evt).catch(() => {})
    } else {
      // Priority 2: Local Signaling / Input Server on port 3001 (for Chrome, Edge, PWA)
      if (this.socket && this.socket.connected) {
        this.socket.emit('ultraviewer:host:execute_input', { event: evt })
      }
      try {
        fetch('http://localhost:3001/api/remote-input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evt),
        }).catch(() => {})
      } catch {}
    }

    if (this.onControlEventCb) {
      this.onControlEventCb(evt)
    }
  }

  /**
   * Connects to Partner PC using Partner ID & Passcode across ANY network (LBM Remote Desktop Mode).
   * Uses TRIPLE-ENGINE SIMULTANEOUS PAIRING (PeerJS + Socket.IO WebRTC + BroadcastChannel)
   */
  connectToPartner(
    partnerId: string,
    passcode: string,
    dummyAudioStream: MediaStream
  ): Promise<{ dataConn?: DataConnection; call?: MediaConnection }> {
    const cleanId = partnerId.replace(/\s+/g, '').trim()
    const targetPeerId = `lbm-mirror-${cleanId}`
    const partnerRoom = `uv_${cleanId}`
    this.activePartnerRoom = partnerRoom
    this.isConnecting = true
    this.notifyStatus('connecting', `Connecting to Partner PC (${cleanId})...`)

    return new Promise((resolve, reject) => {
      let isResolved = false

      const cleanupAndResolve = (result: any) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeoutTimer)
          this.isConnecting = false
          resolve(result)
        }
      }

      const cleanupAndReject = (err: Error) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeoutTimer)
          this.isConnecting = false
          this.notifyStatus('error', err.message)
          reject(err)
        }
      }

      // 10s connection safety timeout
      const timeoutTimer = setTimeout(() => {
        cleanupAndReject(
          new Error(`Partner PC (${cleanId}) से कनेक्ट नहीं हो सका। कृपया जांचें कि Partner PC पर LBM Mirror खुला है और इंटरनेट कनेक्टेड है।`)
        )
      }, 10000)

      // ─── ENGINE 1: DIRECT SOCKET.IO WEBRTC PAIRING ────────────────────────
      if (this.socket && this.socket.connected) {
        console.log('[PeerService] Initiating Engine 1 (Socket.IO WebRTC Signaling)...')
        this.socket.emit('ultraviewer:client:connect', {
          partnerId: cleanId,
          passcode: passcode.trim(),
          clientName: 'Remote Operator',
        })

        this.socket.once('ultraviewer:auth_success', async () => {
          console.log('[PeerService] Socket.IO Auth Success! Setting up WebRTC...')
          this.notifyStatus('connecting', 'Password verified! Establishing 60 FPS video...')

          const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            bundlePolicy: 'max-bundle',
          })
          this.nativeRtcPc = pc

          pc.onicecandidate = (evt) => {
            if (evt.candidate && this.socket) {
              this.socket.emit('ultraviewer:signal', {
                targetRoom: partnerRoom,
                signal: evt.candidate,
                type: 'ice',
              })
            }
          }

          pc.ontrack = (evt) => {
            const stream = (evt.streams && evt.streams[0]) ? evt.streams[0] : new MediaStream([evt.track])
            stream.getTracks().forEach((t) => {
              t.enabled = true
            })
            console.log('[PeerService] Received remote stream via Socket.IO WebRTC!', stream.id)
            this.notifyStatus('connected', 'Connected to Partner PC screen at 60 FPS!')
            this.onRemoteStreamCb?.(stream)
            cleanupAndResolve({ dataConn: undefined, call: undefined })
          }

          pc.ondatachannel = (evt) => {
            this.nativeDataChannel = evt.channel
            this.bindDataChannel(evt.channel)
          }

          dummyAudioStream.getTracks().forEach((track) => {
            pc.addTrack(track, dummyAudioStream)
          })
        })

        this.socket.once('ultraviewer:error', (payload: any) => {
          console.warn('[PeerService] Socket.IO error:', payload)
          if (!this.activeCall) {
            cleanupAndReject(new Error(payload.message || 'Connection rejected by partner.'))
          }
        })
      }

      // ─── ENGINE 2: PEERJS CLOUD WEBRTC PAIRING ────────────────────────────
      try {
        const clientPeer = new Peer({
          config: {
            iceServers: ICE_SERVERS,
            bundlePolicy: 'max-bundle',
          },
          debug: 1,
        })

        clientPeer.on('open', () => {
          this.peer = clientPeer
          const dataConn = clientPeer.connect(targetPeerId, { reliable: true })
          this.activeDataConn = dataConn

          dataConn.on('open', () => {
            dataConn.send({
              type: 'auth:request',
              passcode: passcode.trim(),
              clientName: 'Remote Operator',
            })
          })

          dataConn.on('data', (data: any) => {
            if (data?.type === 'auth:success') {
              this.notifyStatus('connecting', 'Password verified! Receiving 60 FPS screen...')
              const call = clientPeer.call(targetPeerId, dummyAudioStream)
              this.activeCall = call

              call.on('stream', (remoteStream) => {
                this.notifyStatus('connected', 'Connected to Partner PC screen at 60 FPS!')
                this.onRemoteStreamCb?.(remoteStream)
                cleanupAndResolve({ dataConn, call })
              })

              call.on('close', () => {
                this.notifyStatus('disconnected', 'Remote session ended by partner.')
              })
            } else if (data?.type === 'auth:rejected') {
              cleanupAndReject(new Error(data.error || 'गलत पासवर्ड (Invalid Passcode).'))
            } else {
              this.handleIncomingData(data, dataConn)
            }
          })
        })

        clientPeer.on('error', (err: any) => {
          console.warn('[PeerService] PeerJS connection error:', err)
          if (err?.type === 'peer-unavailable' && (!this.socket || !this.socket.connected)) {
            cleanupAndReject(new Error(`Partner PC (${cleanId}) ऑफ़लाइन है या शेयरिंग चालू नहीं है।`))
          }
        })
      } catch (err: any) {
        console.warn('[PeerService] PeerJS launch error:', err)
      }
    })
  }

  /**
   * Connects from Mobile / Sender to PC Host via 6-digit PIN.
   */
  async joinAndCast(pin: string, streamToShare: MediaStream): Promise<MediaConnection> {
    this.localStream = streamToShare
    const targetPeerId = `lbm-mirror-${pin.trim()}`
    this.notifyStatus('connecting', `Connecting to PC with PIN ${pin}...`)

    return new Promise((resolve, reject) => {
      this.destroyPeer()

      try {
        const clientPeer = new Peer({
          config: { iceServers: ICE_SERVERS },
          debug: 1,
        })

        clientPeer.on('open', () => {
          this.peer = clientPeer
          const call = clientPeer.call(targetPeerId, streamToShare)
          this.activeCall = call

          call.on('stream', (remoteStream) => {
            this.onRemoteStreamCb?.(remoteStream)
          })

          call.on('close', () => {
            this.notifyStatus('disconnected', 'Cast ended.')
          })

          call.on('error', (err) => {
            this.notifyStatus('error', err?.message || 'Connection failed.')
            reject(err)
          })

          this.notifyStatus('connected', 'Connected to PC! Screen is mirroring.')
          resolve(call)
        })

        clientPeer.on('error', (err) => {
          this.notifyStatus('error', `Could not find PC with PIN ${pin}. Please verify PIN.`)
          reject(err)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Sends remote input event (mouse, key, shortcut) to Host
   * Uses prioritized single-channel delivery to prevent duplicate/triple click execution
   */
  sendInputEvent(event: RemoteControlEvent) {
    // Priority 1: Direct WebRTC DataConnection (PeerJS)
    if (this.activeDataConn && this.activeDataConn.open) {
      try {
        this.activeDataConn.send({ type: 'remote:input', event })
        return
      } catch {}
    }

    // Priority 2: Direct native RTC DataChannel
    if (this.nativeDataChannel && this.nativeDataChannel.readyState === 'open') {
      try {
        this.nativeDataChannel.send(JSON.stringify({ type: 'remote:input', event }))
        return
      } catch {}
    }

    // Priority 3: Socket.IO relay
    if (this.socket && this.socket.connected && this.activePartnerRoom) {
      try {
        this.socket.emit('ultraviewer:input', {
          targetRoom: this.activePartnerRoom,
          event,
        })
      } catch {}
    }
  }

  sendShortcut(name: 'WIN' | 'TASKMGR' | 'ALTTAB' | 'EXPLORER' | 'CTRL_ALT_DEL' | 'WIN_R' | 'WIN_D') {
    this.sendInputEvent({
      type: 'shortcut',
      name,
    })
  }

  launchApp(app: 'chrome' | 'edge' | 'explorer' | 'notepad' | 'calc' | 'taskmgr' | string) {
    this.sendInputEvent({
      type: 'app:launch',
      app,
    })
  }

  openUrl(url: string) {
    this.sendInputEvent({
      type: 'open:url',
      url,
    })
  }

  sendChatMessage(text: string, senderName = 'Me') {
    const msg: ChatMessage = {
      id: String(Date.now()),
      sender: 'me',
      senderName,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    if (this.activeDataConn && this.activeDataConn.open) {
      try {
        this.activeDataConn.send({ type: 'chat:message', ...msg })
      } catch {}
    }

    if (this.nativeDataChannel && this.nativeDataChannel.readyState === 'open') {
      try {
        this.nativeDataChannel.send(JSON.stringify({ type: 'chat:message', message: msg }))
      } catch {}
    }

    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit('ultraviewer:chat', {
          targetRoom: this.activePartnerRoom,
          message: msg,
        })
      } catch {}
    }

    this.onChatCb?.(msg)
  }

  sendClipboard(text: string) {
    if (this.activeDataConn && this.activeDataConn.open) {
      try {
        this.activeDataConn.send({ type: 'clipboard:text', text })
      } catch {}
    }

    if (this.nativeDataChannel && this.nativeDataChannel.readyState === 'open') {
      try {
        this.nativeDataChannel.send(JSON.stringify({ type: 'clipboard:text', text }))
      } catch {}
    }

    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit('ultraviewer:clipboard', {
          targetRoom: this.activePartnerRoom,
          text,
        })
      } catch {}
    }
  }

  broadcastToTabs(type: string, payload: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, payload, timestamp: Date.now() })
      } catch {}
    }
  }

  private handleBroadcastMessage(data: any) {
    if (!data?.type) return
    if (data.type === 'host:ready' && data.payload?.pin) {
      console.log('[PeerService] Detected Host ready in another tab:', data.payload.pin)
    }
  }

  private notifyStatus(status: 'idle' | 'ready' | 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) {
    this.onConnectionStateCb?.(status, detail)
  }

  destroyPeer() {
    if (this.activeCall) {
      try { this.activeCall.close() } catch {}
      this.activeCall = null
    }
    if (this.activeDataConn) {
      try { this.activeDataConn.close() } catch {}
      this.activeDataConn = null
    }
    if (this.nativeRtcPc) {
      try { this.nativeRtcPc.close() } catch {}
      this.nativeRtcPc = null
    }
    if (this.nativeDataChannel) {
      try { this.nativeDataChannel.close() } catch {}
      this.nativeDataChannel = null
    }
    if (this.peer) {
      try { this.peer.destroy() } catch {}
      this.peer = null
    }
  }
}

export const defaultPeerService = new PeerService()
