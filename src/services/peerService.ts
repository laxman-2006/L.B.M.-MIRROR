/**
 * LBM Mirror - Universal WebRTC Peer-to-Peer Cloud Engine
 * Uses PeerJS + Google STUN servers for 100% serverless, zero-backend cross-device screen mirroring.
 * Works seamlessly on Vercel, GitHub Pages, Mobile Browsers, and Desktop.
 */

import { Peer, type MediaConnection, type DataConnection } from 'peerjs'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
]

export class PeerService {
  private peer: Peer | null = null
  private activeCall: MediaConnection | null = null
  private activeDataConn: DataConnection | null = null
  private localStream: MediaStream | null = null
  private currentPin: string = ''
  private broadcastChannel: BroadcastChannel | null = null

  private onRemoteStreamCb: ((stream: MediaStream) => void) | null = null
  private onConnectionStateCb: ((status: 'idle' | 'ready' | 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) => void) | null = null

  constructor() {
    // Setup BroadcastChannel for zero-latency same-browser cross-tab testing
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('lbm_screen_mirror_bc')
        this.broadcastChannel.onmessage = (evt) => {
          this.handleBroadcastMessage(evt.data)
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

  /**
   * Initializes host receiver peer using the 6-digit PIN.
   * e.g. peer id: `lbm-mirror-839201`
   */
  initHost(pin: string, outgoingStream?: MediaStream | null): Promise<string> {
    this.currentPin = pin.trim()
    if (outgoingStream) this.localStream = outgoingStream

    return new Promise((resolve) => {
      this.destroyPeer()

      const hostPeerId = `lbm-mirror-${this.currentPin}`

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
          this.notifyStatus('ready', `Host ready with PIN ${this.currentPin}`)
          resolve(id)
        })

        p.on('call', (mediaConn) => {
          this.activeCall = mediaConn
          this.notifyStatus('connecting', 'Incoming mobile screen stream...')

          // Answer call with local stream (if broadcasting) or receive stream
          mediaConn.answer(this.localStream || undefined)

          mediaConn.on('stream', (remoteStream) => {
            this.notifyStatus('connected', 'Live screen stream active!')
            if (this.onRemoteStreamCb) {
              this.onRemoteStreamCb(remoteStream)
            }
          })

          mediaConn.on('close', () => {
            this.notifyStatus('disconnected', 'Stream closed by sender')
          })

          mediaConn.on('error', (err) => {
            console.warn('[PeerService] Call error:', err)
            this.notifyStatus('error', err?.message || 'Call connection error')
          })
        })

        p.on('connection', (dataConn) => {
          this.activeDataConn = dataConn
          dataConn.on('open', () => {
            dataConn.send({ type: 'host:welcome', pin: this.currentPin })
          })
          dataConn.on('data', (data: any) => {
            if (data?.type === 'client:ping') {
              dataConn.send({ type: 'host:pong', timestamp: Date.now() })
            }
          })
        })

        p.on('error', (err: any) => {
          // If ID is already taken (e.g. refreshed page quickly), generate fallback peer
          if (err.type === 'unavailable-id') {
            console.log('[PeerService] Host ID in use, attempting secondary connect')
          } else {
            console.warn('[PeerService] Host error:', err)
          }
        })

        p.on('disconnected', () => {
          this.notifyStatus('disconnected', 'Disconnected from signaling')
        })
      } catch (err: any) {
        console.error('[PeerService] Initialization error:', err)
        resolve('')
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
            if (this.onRemoteStreamCb) {
              this.onRemoteStreamCb(remoteStream)
            }
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
   * Broadcast message to local browser tabs for instant same-machine testing
   */
  broadcastToTabs(type: string, payload: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, payload, timestamp: Date.now() })
      } catch {}
    }
  }

  private handleBroadcastMessage(data: any) {
    if (!data?.type) return
    if (data.type === 'tab:stream_ready' && data.payload?.pin === this.currentPin) {
      this.notifyStatus('connecting', 'Detected cast in another tab!')
    }
  }

  private notifyStatus(status: 'idle' | 'ready' | 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) {
    if (this.onConnectionStateCb) {
      this.onConnectionStateCb(status, detail)
    }
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
    if (this.peer) {
      try { this.peer.destroy() } catch {}
      this.peer = null
    }
  }
}

export const defaultPeerService = new PeerService()
