import { Room, RoomEvent, RemoteParticipant, RemoteTrack, Track } from 'livekit-client'

export interface LiveKitConfig {
  url: string
  token: string
  roomName: string
}

export class LiveKitService {
  private room: Room | null = null
  private config: LiveKitConfig | null = null

  setConfig(config: LiveKitConfig) {
    this.config = config
  }

  async connect(): Promise<boolean> {
    if (!this.config) {
      throw new Error('LiveKit configuration not set')
    }

    try {
      console.log('Attempting to connect to LiveKit with config:', {
        url: this.config.url,
        roomName: this.config.roomName,
        tokenLength: this.config.token?.length || 0
      })

      this.room = new Room()
      
      // Set up event listeners
      this.room.on(RoomEvent.Connected, () => {
        console.log('✅ Connected to LiveKit room:', this.config?.roomName)
      })

      this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('🎵 Audio track received from agent:', participant.identity)
          // Audio from the agent will automatically play
          const audioElement = track.attach()
          document.body.appendChild(audioElement)
        }
      })

      this.room.on(RoomEvent.Disconnected, () => {
        console.log('❌ Disconnected from LiveKit room')
      })

      this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('🔄 Connection state changed:', state)
      })

      // Connect to the room
      console.log('🔄 Connecting to room...')
      await this.room.connect(this.config.url, this.config.token)
      console.log('✅ Room connection successful')
      
      return true
    } catch (error) {
      console.error('❌ Failed to connect to LiveKit:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message)
        console.error('Error stack:', error.stack)
      }
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect()
      this.room = null
    }
  }

  async enableMicrophone(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room')
    }

    try {
      await this.room.localParticipant.enableCameraAndMicrophone()
      console.log('Microphone enabled')
    } catch (error) {
      console.error('Failed to enable microphone:', error)
      throw error
    }
  }

  async disableMicrophone(): Promise<void> {
    if (!this.room) {
      return
    }

    this.room.localParticipant.setMicrophoneEnabled(false)
    console.log('Microphone disabled')
  }

  getRoom(): Room | null {
    return this.room
  }

  isConnected(): boolean {
    return this.room?.state === 'connected'
  }
}

export const livekitService = new LiveKitService()

// Token generation utility 
// Since you're using LiveKit Cloud, you can generate tokens using the CLI:
// lk token create --room "vocastant-room" --identity "user-$(date +%s)" --join --valid-for "1h"

export function generateNewTokenInstructions(): string {
  return `
To generate a new token for your LiveKit deployment, run this command in your terminal:

lk token create --room "vocastant-room" --identity "user-$(date +%s)" --join --valid-for "1h"

Then update the VITE_LIVEKIT_TOKEN environment variable with the new token.
  `.trim()
}
