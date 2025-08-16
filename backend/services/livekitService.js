const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');
const { v4: uuidv4 } = require('uuid');

class LiveKitService {
  constructor() {
    const rawUrl = process.env.LIVEKIT_URL || 'wss://vocastant-8kvolde0.livekit.cloud';
    this.livekitUrl = rawUrl; // Keep the original wss:// URL for frontend connections
    this.apiUrl = rawUrl.replace('wss://', 'https://'); // Use https:// for API calls
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!this.apiKey || !this.apiSecret) {
      console.error('❌ Missing LiveKit API credentials!');
      console.error('Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env file');
      process.exit(1);
    }

    this.roomService = new RoomServiceClient(this.apiUrl, this.apiKey, this.apiSecret);
  }

  // Create a new room
  async createRoom(roomName) {
    try {
      const room = await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 10 * 60, // 10 minutes
        maxParticipants: 20
      });
      
      console.log('🏠 Created LiveKit room:', roomName);
      return room;
    } catch (error) {
      console.error('❌ Failed to create LiveKit room:', error);
      throw error;
    }
  }

  // Generate access token for a participant
  generateToken(roomName, participantIdentity, participantName = null) {
    try {
      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: participantIdentity,
        name: participantName || participantIdentity
      });

      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      });

      const token = at.toJwt();
      console.log('🔑 Generated token for:', participantIdentity, 'in room:', roomName);
      return token;
    } catch (error) {
      console.error('❌ Failed to generate token:', error);
      throw error;
    }
  }

  // Get room info
  async getRoom(roomName) {
    try {
      const room = await this.roomService.getRoom(roomName);
      return room;
    } catch (error) {
      console.error('❌ Failed to get room:', error);
      return null;
    }
  }

  // Delete a room
  async deleteRoom(roomName) {
    try {
      await this.roomService.deleteRoom(roomName);
      console.log('🗑️ Deleted LiveKit room:', roomName);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete room:', error);
      return false;
    }
  }

  // List all rooms
  async listRooms() {
    try {
      const rooms = await this.roomService.listRooms();
      return rooms;
    } catch (error) {
      console.error('❌ Failed to list rooms:', error);
      return [];
    }
  }
}

module.exports = LiveKitService;
