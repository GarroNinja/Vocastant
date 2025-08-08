# Vocastant Backend

Backend API server for managing LiveKit rooms and generating access tokens.

## Features

- ✅ **Room Management**: Create, list, and delete LiveKit rooms
- ✅ **Token Generation**: Generate secure access tokens for participants
- ✅ **RESTful API**: Clean HTTP endpoints for frontend integration
- ✅ **CORS Support**: Configured for frontend communication
- ✅ **Error Handling**: Comprehensive error handling and logging

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
# LiveKit Configuration
LIVEKIT_URL=https://vocastant-8kvolde0.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 3. Get LiveKit API Credentials

1. Go to [LiveKit Cloud Console](https://cloud.livekit.io/)
2. Select your project
3. Go to **API Keys** section
4. Copy your **API Key** and **API Secret**

### 4. Run the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Room Management
```
POST   /api/rooms          # Create a new room
GET    /api/rooms          # List all rooms
GET    /api/rooms/:name    # Get room information
DELETE /api/rooms/:name    # Delete a room
```

### Token Generation
```
POST /api/tokens           # Generate access token
```

## Usage Examples

### Create a Room
```bash
curl -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "my-room",
    "maxParticipants": 20,
    "emptyTimeout": 600
  }'
```

### Generate a Token
```bash
curl -X POST http://localhost:3001/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "my-room",
    "participantName": "user-123",
    "ttl": 3600
  }'
```

## Frontend Integration

The frontend can now call these endpoints instead of using the LiveKit CLI:

```javascript
// Create room and get token
const response = await fetch('http://localhost:3001/api/tokens', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomName: 'my-room',
    participantName: 'user-123'
  })
});

const { token, livekitUrl } = await response.json();
```

## Troubleshooting

### Missing API Credentials
```
❌ Missing LiveKit API credentials!
Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env file
```

**Solution**: Check your `.env` file and ensure the API credentials are correct.

### CORS Issues
**Solution**: Verify the `FRONTEND_URL` in your `.env` file matches your frontend URL.

### Port Conflicts
**Solution**: Change the `PORT` in your `.env` file if port 3001 is already in use.

## Security Notes

- 🔒 API keys are sensitive - never commit them to version control
- 🌐 CORS is configured for development - adjust for production
- ⏰ Tokens have configurable TTL (default: 1 hour)
- 👥 Room permissions are configurable per participant
