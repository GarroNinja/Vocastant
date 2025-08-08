// Room service for managing LiveKit connections
// Now uses backend API for room creation and token generation

export interface RoomConfig {
  roomName: string
  participantName: string
  token?: string // Optional pre-generated token
}

export interface LiveKitConfig {
  url: string
  token: string
  roomName: string
}

export class RoomService {
  private static instance: RoomService
  private readonly livekitUrl = 'wss://vocastant-8kvolde0.livekit.cloud'
  private readonly backendUrl = 'http://localhost:3001'

  constructor() {
    // Constructor ready for future features
  }

  static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService()
    }
    return RoomService.instance
  }

  // Generate a unique room name
  generateRoomName(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `vocastant-${timestamp}-${random}`
  }

  // Create a room and get connection details
  async createRoom(config: RoomConfig): Promise<LiveKitConfig> {
    try {
      const roomName = config.roomName || this.generateRoomName()
      const participantName = config.participantName || 'user'
      
      // If token is provided, use it directly
      if (config.token) {
        return {
          url: this.livekitUrl,
          token: config.token,
          roomName
        }
      }

      console.log(`🔄 Creating room via backend API: ${roomName}`)
      
      // Create room via backend API
      const roomResponse = await fetch(`${this.backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          maxParticipants: 20,
          emptyTimeout: 600
        })
      })

      if (!roomResponse.ok) {
        throw new Error(`Failed to create room: ${roomResponse.statusText}`)
      }

      // Generate token for the participant
      const tokenResponse = await fetch(`${this.backendUrl}/api/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName,
          ttl: 3600 // 1 hour
        })
      })

      if (!tokenResponse.ok) {
        throw new Error(`Failed to generate token: ${tokenResponse.statusText}`)
      }

      const { token } = await tokenResponse.json()
      
      console.log(`✅ Room created and token generated: ${roomName}`)
      
      return {
        url: this.livekitUrl,
        token,
        roomName
      }
    } catch (error) {
      console.error('Failed to create room:', error)
      throw new Error(`Room creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Join an existing room
  async joinRoom(config: RoomConfig): Promise<LiveKitConfig> {
    try {
      const roomName = config.roomName || this.generateRoomName()
      const participantName = config.participantName || 'user'
      
      // If token is provided, use it directly
      if (config.token) {
        return {
          url: this.livekitUrl,
          token: config.token,
          roomName
        }
      }

      console.log(`🔑 Generating token for existing room: ${roomName}`)
      
      // Generate token for existing room
      const tokenResponse = await fetch(`${this.backendUrl}/api/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName,
          ttl: 3600 // 1 hour
        })
      })

      if (!tokenResponse.ok) {
        throw new Error(`Failed to generate token: ${tokenResponse.statusText}`)
      }

      const { token } = await tokenResponse.json()
      
      console.log(`✅ Token generated for room: ${roomName}`)
      
      return {
        url: this.livekitUrl,
        token,
        roomName
      }
    } catch (error) {
      console.error('Failed to join room:', error)
      throw new Error(`Failed to join room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const roomService = RoomService.getInstance()
