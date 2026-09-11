/**
 * LBM Mirror - Universal WebRTC Peer-to-Peer Cloud Engine (UltraViewer Mode)
 * Uses PeerJS + Google STUN servers for 100% serverless, zero-backend cross-device screen mirroring & remote control.
 * Works across ANY network, different Wi-Fi, 4G/5G, and worldwide over the internet.
 */

import { Peer, type MediaConnection, type DataConnection } from 'peerjs'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.services.mozilla.com' },
  { urls: 'stun:stun.cloudflare.com:3478' },
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
  x?: number
  y?: number
  button?: 'left' | 'right' | 'middle'
  deltaY?: number
  delta?: number
  key?: string
  code?: string
  text?: string
  name?: string
}

export interface ChatMessage {
  id: string
  sender: 'me' | 'partner'
  senderName: string
  text: string
  time: string
}

export class PeerService {
  private peer: Peer | null = null
  private activeCall: MediaConnection | null = null
  private activeDataConn: DataConnection | null = null
  private localStream: MediaStream | null = null
  private streamProvider: (() => Promise<MediaStream | null>) | null = null
  private currentPin: string = ''
  private currentPasscode: string = ''
  private broadcastChannel: BroadcastChannel | null = null

  private onRemoteStreamCb: ((stream: MediaStream) => void) | null = null
  private onConnectionStateCb: ((status: 'idle' | 'ready' | 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) => void) | null = null
  private onControlEventCb: ((event: RemoteControlEvent) => void) | null = null
  private onChatCb: ((msg: ChatMessage) => void) | null = null
  private onClipboardCb: ((text: string) => void) | null = null

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
  }

  setStreamProvider(provider: () => Promise<MediaStream | null>) {
    this.streamProvider = provider
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream
  }

  /**
   * Initializes host receiver peer using the 6-digit PIN / ID.
   * e.g. peer id: `lbm-mirror-839201`
   */
  initHost(pin: string, outgoingStream?: MediaStream | null, passcode?: string): Promise<string> {
    this.currentPin = pin.trim()
    if (outgoingStream) this.localStream = outgoingStream
    if (passcode) this.currentPasscode = passcode.trim()

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
          this.notifyStatus('ready', `Host ready with ID ${this.currentPin}`)
          resolve(id)
        })

        p.on('call', async (mediaConn) => {
          this.activeCall = mediaConn
          this.notifyStatus('connecting', 'Incoming screen call connection...')

          let streamToAnswer = this.localStream
          if (!streamToAnswer && this.streamProvider) {
            try {
              streamToAnswer = await this.streamProvider()
              if (streamToAnswer) this.localStream = streamToAnswer
            } catch (err) {
              console.warn('[PeerService] Stream provider error:', err)
            }
          }

          // Answer call with local stream (PC screen broadcast)
          mediaConn.answer(streamToAnswer || undefined)

          mediaConn.on('stream', (remoteStream) => {
            this.notifyStatus('connected', 'Live screen stream active!')
            if (this.onRemoteStreamCb) {
              this.onRemoteStreamCb(remoteStream)
            }
          })

          mediaConn.on('close', () => {
            this.notifyStatus('disconnected', 'Stream closed by partner')
          })

          mediaConn.on('error', (err) => {
            console.warn('[PeerService] Call error:', err)
            this.notifyStatus('error', err?.message || 'Call connection error')
          })
        })

        p.on('connection', (dataConn) => {
          this.activeDataConn = dataConn
          console.log('[PeerService] Data channel connected from operator:', dataConn.peer)

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
            console.log('[PeerService] Host ID in use, awaiting reconnect')
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
          screenWidth: window.screen ? window.screen.width : 1920,
          screenHeight: window.screen ? window.screen.height : 1080,
        })
        this.notifyStatus('connected', 'Remote operator authenticated with control')
      } else {
        console.warn('[PeerService] Remote passcode rejected!')
        dataConn.send({
          type: 'auth:rejected',
          error: 'गलत पासकोड (Invalid Passcode). Please check passcode on Host PC.',
        })
      }
      return
    }

    // 2. UltraViewer Remote Control Events (Mouse, Keyboard, Shortcuts)
    if (data.type === 'remote:input') {
      const evt: RemoteControlEvent = data.event
      if (evt) {
        // Forward to native Electron input bridge if running in Desktop mode
        if (typeof window !== 'undefined' && window.electronAPI?.remoteInput) {
          window.electronAPI.remoteInput.sendEvent(evt).catch(() => {})
        }

        if (this.onControlEventCb) {
          this.onControlEventCb(evt)
        }
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

    // 5. Ping / Pong
    if (data.type === 'client:ping') {
      dataConn.send({ type: 'host:pong', timestamp: Date.now() })
    }
  }

  /**
   * Connects to Partner PC using Partner ID & Passcode across ANY network (UltraViewer Mode).
   */
  connectToPartner(
    partnerId: string,
    passcode: string,
    dummyAudioStream: MediaStream
  ): Promise<{ dataConn: DataConnection; call: MediaConnection }> {
    const cleanId = partnerId.replace(/\s+/g, '').trim()
    const targetPeerId = `lbm-mirror-${cleanId}`
    this.notifyStatus('connecting', `Connecting to Partner PC (${cleanId})...`)

    return new Promise((resolve, reject) => {
      this.destroyPeer()

      try {
        const clientPeer = new Peer({
          config: {
            iceServers: ICE_SERVERS,
            bundlePolicy: 'max-bundle',
          },
          debug: 1,
        })

        let isResolved = false

        clientPeer.on('open', () => {
          this.peer = clientPeer

          // 1. Establish DataConnection for UltraViewer Control & Auth
          const dataConn = clientPeer.connect(targetPeerId, {
            reliable: true,
          })
          this.activeDataConn = dataConn

          dataConn.on('open', () => {
            console.log('[PeerService] Connected to Partner data channel! Sending auth...')
            dataConn.send({
              type: 'auth:request',
              passcode: passcode.trim(),
              clientName: 'Remote Operator',
            })
          })

          dataConn.on('data', (data: any) => {
            if (data?.type === 'auth:success') {
              console.log('[PeerService] Auth granted by Partner! Calling screen stream...')
              // 2. Call Partner with dummy audio stream to receive remote 60 FPS video stream
              const call = clientPeer.call(targetPeerId, dummyAudioStream)
              this.activeCall = call

              call.on('stream', (remoteStream) => {
                this.notifyStatus('connected', 'Connected to Partner PC screen at 60 FPS!')
                if (this.onRemoteStreamCb) {
                  this.onRemoteStreamCb(remoteStream)
                }
              })

              call.on('close', () => {
                this.notifyStatus('disconnected', 'Remote session ended by partner.')
              })

              call.on('error', (err) => {
                this.notifyStatus('error', err?.message || 'Media stream error')
              })

              if (!isResolved) {
                isResolved = true
                resolve({ dataConn, call })
              }
            } else if (data?.type === 'auth:rejected') {
              const errMsg = data.error || 'गलत पासकोड (Invalid Passcode).'
              this.notifyStatus('error', errMsg)
              if (!isResolved) {
                isResolved = true
                reject(new Error(errMsg))
              }
            } else {
              this.handleIncomingData(data, dataConn)
            }
          })

          dataConn.on('error', (err) => {
            this.notifyStatus('error', err?.message || 'Data connection error')
            if (!isResolved) {
              isResolved = true
              reject(err)
            }
          })
        })

        clientPeer.on('error', (err: any) => {
          let msg = `Could not find Partner PC with ID ${cleanId}. Please ensure Partner PC is actively sharing.`
          if (err?.type === 'peer-unavailable') {
            msg = `Partner PC (${cleanId}) offline hai ya sharing on nahi hai.`
          }
          this.notifyStatus('error', msg)
          if (!isResolved) {
            isResolved = true
            reject(new Error(msg))
          }
        })
      } catch (err) {
        reject(err)
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
   * Sends UltraViewer input event (mouse, key, shortcut) to Host
   */
  sendInputEvent(event: RemoteControlEvent) {
    if (this.activeDataConn && this.activeDataConn.open) {
      try {
        this.activeDataConn.send({
          type: 'remote:input',
          event,
        })
      } catch (err) {
        console.warn('[PeerService] Failed to send input event:', err)
      }
    }
  }

  /**
   * Sends chat message to Partner
   */
  sendChatMessage(text: string, senderName = 'Me') {
    if (this.activeDataConn && this.activeDataConn.open) {
      const msg: ChatMessage = {
        id: String(Date.now()),
        sender: 'me',
        senderName,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      try {
        this.activeDataConn.send({
          type: 'chat:message',
          ...msg,
        })
        if (this.onChatCb) {
          this.onChatCb(msg)
        }
      } catch {}
    }
  }

  /**
   * Syncs clipboard text across machines
   */
  sendClipboard(text: string) {
    if (this.activeDataConn && this.activeDataConn.open) {
      try {
        this.activeDataConn.send({
          type: 'clipboard:text',
          text,
        })
      } catch {}
    }
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
