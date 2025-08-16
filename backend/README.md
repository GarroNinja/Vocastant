# Vocastant Backend

A modular Node.js backend for Vocastant, providing LiveKit room management, document processing, and AI agent integration.

## 🏗️ Architecture

The backend has been refactored into a modular structure for better maintainability:

```
backend/
├── main.js                 # Main server entry point
├── routes/                 # Route handlers
│   ├── documents.js        # Document-related endpoints
│   └── rooms.js           # Room management endpoints
├── middleware/             # Express middleware
│   └── roomMiddleware.js   # Room validation middleware
├── services/               # Business logic services
│   └── livekitService.js   # LiveKit integration service
├── utils/                  # Utility functions
│   └── textExtractor.js    # Text extraction utilities
├── database.js             # Database operations
├── s3.js                   # AWS S3 operations
└── package.json            # Dependencies and scripts
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔧 Key Features

### Document Management
- **Agent Access**: `/api/documents/:documentId/agent-content` - Direct document access for AI agents
- **Room-scoped Access**: `/api/documents/:documentId/content?roomName=room` - Room-validated document access
- **File Upload**: Support for PDF, Word, and text files with automatic text extraction
- **S3 Integration**: Secure file storage and presigned URL generation

### Room Management
- **Create/Join**: `/api/rooms` - Create or join LiveKit rooms
- **Document Context**: `/api/rooms/:roomName/context` - Get all documents for AI context
- **Participant Tracking**: Automatic participant management and cleanup

### LiveKit Integration
- **Real-time Communication**: WebRTC-based voice and video rooms
- **Token Generation**: Secure access tokens for room participants
- **Room Lifecycle**: Automatic room creation, management, and cleanup

## 📡 API Endpoints

### Documents
- `GET /api/documents/:documentId/agent-content` - Agent document access
- `GET /api/documents/:documentId/content?roomName=room` - Room-scoped content
- `GET /api/documents/:documentId/view?roomName=room` - Document preview
- `GET /api/documents/:documentId/download?roomName=room` - Document download
- `DELETE /api/documents/:documentId?roomName=room` - Delete document

### Rooms
- `POST /api/rooms` - Create/join room
- `GET /api/rooms/:roomName/documents` - List room documents
- `POST /api/rooms/:roomName/documents` - Upload document to room
- `GET /api/rooms/:roomName/context` - Get room context for AI
- `POST /api/rooms/:roomName/leave` - Leave room
- `DELETE /api/rooms/:roomName` - Delete room

## 🔒 Security Features

- **CORS Configuration**: Whitelisted origins for production
- **Room Validation**: All document operations require valid room context
- **Agent Access**: Special endpoint for AI agents with document validation
- **S3 Security**: Presigned URLs with expiration and access controls

## 🐳 Docker Deployment

```bash
# Build and run
docker build -t vocastant-backend .
docker run -p 3001:3001 vocastant-backend

# Or use docker-compose
docker-compose up -d
```

## 🔍 Troubleshooting

### Common Issues

1. **404 on agent-content endpoint**: Ensure the route is defined before other document routes
2. **Database connection errors**: Check PostgreSQL connection and credentials
3. **S3 upload failures**: Verify AWS credentials and bucket permissions
4. **LiveKit errors**: Confirm API key and secret configuration

### Logs

The server provides detailed logging for debugging:
- Room operations: 🏠
- Document operations: 📄
- Agent access: 🤖
- Errors: ❌
- Success: ✅

## 📚 Dependencies

- **Express.js**: Web framework
- **LiveKit**: Real-time communication
- **PostgreSQL**: Database
- **AWS SDK**: S3 integration
- **Multer**: File upload handling
- **PDF Parse**: PDF text extraction
- **Mammoth**: Word document processing

## 🤝 Contributing

1. Follow the modular structure
2. Add routes to appropriate route files
3. Implement business logic in services
4. Use middleware for common functionality
5. Update documentation for new endpoints

## 📄 License

MIT License - see LICENSE file for details
