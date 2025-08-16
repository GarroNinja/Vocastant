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
  private readonly backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://d1ye5bx9w8mu3e.cloudfront.net'

  constructor() {
    // Constructor ready for future features
    console.log('🔧 RoomService initialized with backend URL:', this.backendUrl)
    console.log('🔧 Environment VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL)
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
      console.log(`🔗 Using backend URL: ${this.backendUrl}`)
      
      // Create room via backend API (now returns token directly)
      const roomResponse = await fetch(`${this.backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantIdentity: participantName,
          participantName
        })
      })

      if (!roomResponse.ok) {
        const errorText = await roomResponse.text();
        console.error('❌ Room creation failed:', errorText);
        throw new Error(`Failed to create room: ${roomResponse.statusText}`)
      }

      const roomData = await roomResponse.json();
      
      if (!roomData.success || !roomData.token) {
        throw new Error('Invalid response from room creation API');
      }

      console.log(`✅ Room created successfully: ${roomData.room.name}`)
      
      return {
        url: roomData.livekitUrl || this.livekitUrl,
        token: roomData.token,
        roomName: roomData.room.name
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

      console.log(`🔑 Joining existing room: ${roomName}`)
      
      // Join room via backend API (creates room if it doesn't exist)
      const roomResponse = await fetch(`${this.backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantIdentity: participantName,
          participantName
        })
      })

      if (!roomResponse.ok) {
        const errorText = await roomResponse.text();
        console.error('❌ Room join failed:', errorText);
        throw new Error(`Failed to join room: ${roomResponse.statusText}`)
      }

      const roomData = await roomResponse.json();
      
      if (!roomData.success || !roomData.token) {
        throw new Error('Invalid response from room join API');
      }

      console.log(`✅ Joined room successfully: ${roomData.room.name}`)
      
      return {
        url: roomData.livekitUrl || this.livekitUrl,
        token: roomData.token,
        roomName: roomData.room.name
      }
    } catch (error) {
      console.error('Failed to join room:', error)
      throw new Error(`Failed to join room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const roomService = RoomService.getInstance()
