const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001; // Use environment PORT or default to 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize LiveKit client (convert wss:// to https:// for SDK)
const rawUrl = process.env.LIVEKIT_URL || 'wss://vocastant-8kvolde0.livekit.cloud';
const livekitUrl = rawUrl.replace('wss://', 'https://');
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error('❌ Missing LiveKit API credentials!');
  console.error('Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env file');
  process.exit(1);
}

const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only PDF, DOCX, and TXT files
    const allowedExtensions = /\.(pdf|docx|txt)$/i;
    const extname = allowedExtensions.test(file.originalname.toLowerCase());
    
    // Check mimetype for specific formats
    const allowedMimetypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/txt'
    ];
    
    const mimetypeValid = allowedMimetypes.includes(file.mimetype) || file.mimetype.startsWith('text/');
    
    if (extname && mimetypeValid) {
      return cb(null, true);
    } else {
      cb(new Error(`Only PDF, DOCX, and TXT files are allowed. Got: ${file.mimetype} with extension ${path.extname(file.originalname)}`));
    }
  }
});

// Store uploaded documents in memory for analysis
const uploadedDocuments = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    livekit: livekitUrl,
    timestamp: new Date().toISOString()
  });
});

// Create a new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { roomName, maxParticipants = 20, emptyTimeout = 600 } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    console.log(`🔄 Creating room: ${roomName}`);
    
    const room = await roomService.createRoom({
      name: roomName,
      maxParticipants,
      emptyTimeout
    });

    console.log(`✅ Room created: ${roomName}`);
    
    res.json({
      success: true,
      room: {
        name: room.name,
        maxParticipants: room.maxParticipants,
        emptyTimeout: room.emptyTimeout,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Failed to create room:', error);
    res.status(500).json({ 
      error: 'Failed to create room',
      details: error.message 
    });
  }
});

// Generate access token for joining a room
app.post('/api/tokens', async (req, res) => {
  try {
    const { roomName, participantName, ttl = 3600 } = req.body;
    
    if (!roomName || !participantName) {
      return res.status(400).json({ 
        error: 'Room name and participant name are required' 
      });
    }

    console.log(`🔑 Generating token for ${participantName} in room ${roomName}`);
    
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: ttl // Token valid for 1 hour by default
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    });

    const token = await at.toJwt();
    
    console.log(`✅ Token generated for ${participantName}`);
    
    res.json({
      success: true,
      token,
      roomName,
      participantName,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      livekitUrl
    });
  } catch (error) {
    console.error('❌ Failed to generate token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      details: error.message 
    });
  }
});

// Get room information
app.get('/api/rooms/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    
    console.log(`🔍 Getting info for room: ${roomName}`);
    
    const room = await roomService.getRoom(roomName);
    
    res.json({
      success: true,
      room: {
        name: room.name,
        maxParticipants: room.maxParticipants,
        emptyTimeout: room.emptyTimeout,
        numParticipants: room.numParticipants,
        createdAt: room.creationTime,
        metadata: room.metadata
      }
    });
  } catch (error) {
    console.error('❌ Failed to get room info:', error);
    res.status(500).json({ 
      error: 'Failed to get room info',
      details: error.message 
    });
  }
});

// List all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    console.log('📋 Listing all rooms');
    
    const rooms = await roomService.listRooms();
    
    res.json({
      success: true,
      rooms: rooms.map(room => ({
        name: room.name,
        numParticipants: room.numParticipants,
        maxParticipants: room.maxParticipants,
        emptyTimeout: room.emptyTimeout,
        createdAt: room.creationTime
      }))
    });
  } catch (error) {
    console.error('❌ Failed to list rooms:', error);
    res.status(500).json({ 
      error: 'Failed to list rooms',
      details: error.message 
    });
  }
});

// Delete a room
app.delete('/api/rooms/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    
    console.log(`🗑️ Deleting room: ${roomName}`);
    
    await roomService.deleteRoom(roomName);
    
    console.log(`✅ Room deleted: ${roomName}`);
    
    res.json({
      success: true,
      message: `Room ${roomName} deleted successfully`
    });
  } catch (error) {
    console.error('❌ Failed to delete room:', error);
    res.status(500).json({ 
      error: 'Failed to delete room',
      details: error.message 
    });
  }
});

// Document upload endpoint
app.post('/api/documents', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, path: filePath, mimetype, size } = req.file;
    
    console.log(`📄 Processing document: ${originalname}`);
    
    let extractedText = '';
    
    // Extract text based on file type
    if (mimetype === 'application/pdf') {
      const fileBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(fileBuffer);
      extractedText = pdfData.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value;
    } else if (mimetype === 'text/plain') {
      extractedText = await fs.readFile(filePath, 'utf8');
    }

    // Store document metadata and content
    const documentId = Date.now().toString();
    const documentData = {
      id: documentId,
      originalName: originalname,
      filename: filename,
      path: filePath,
      mimetype: mimetype,
      size: size,
      extractedText: extractedText,
      uploadedAt: new Date().toISOString(),
      wordCount: extractedText.split(/\s+/).length,
      characterCount: extractedText.length
    };
    
    uploadedDocuments.set(documentId, documentData);
    
    console.log(`✅ Document processed: ${originalname} (${documentData.wordCount} words)`);
    
    res.json({
      success: true,
      document: {
        id: documentId,
        originalName: originalname,
        size: size,
        wordCount: documentData.wordCount,
        characterCount: documentData.characterCount,
        uploadedAt: documentData.uploadedAt,
        type: mimetype
      }
    });

  } catch (error) {
    console.error('❌ Failed to process document:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message 
    });
  }
});

// Get document analysis
app.get('/api/documents/:documentId/analyze', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { question } = req.query;
    
    const documentData = uploadedDocuments.get(documentId);
    
    if (!documentData) {
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log(`🔍 Analyzing document ${documentData.originalName} for question: ${question || 'general summary'}`);

    // Basic text analysis
    const analysis = {
      documentId: documentId,
      originalName: documentData.originalName,
      wordCount: documentData.wordCount,
      characterCount: documentData.characterCount,
      question: question || 'general summary',
      extractedText: documentData.extractedText.substring(0, 2000), // First 2000 chars for preview
      fullTextAvailable: true,
      analyzedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('❌ Failed to analyze document:', error);
    res.status(500).json({ 
      error: 'Failed to analyze document',
      details: error.message 
    });
  }
});

// List uploaded documents
app.get('/api/documents', (req, res) => {
  try {
    console.log(`📋 Listing documents. Total documents in memory: ${uploadedDocuments.size}`);
    
    const documents = Array.from(uploadedDocuments.values()).map(doc => ({
      id: doc.id,
      originalName: doc.originalName,
      size: doc.size,
      wordCount: doc.wordCount,
      characterCount: doc.characterCount,
      uploadedAt: doc.uploadedAt,
      type: doc.mimetype
    }));

    console.log(`✅ Returning ${documents.length} documents`);
    if (documents.length > 0) {
      documents.forEach(doc => {
        console.log(`  - ${doc.originalName} (ID: ${doc.id}, ${doc.wordCount} words)`);
      });
    }

    res.json({
      success: true,
      documents: documents
    });
  } catch (error) {
    console.error('❌ Failed to list documents:', error);
    res.status(500).json({ 
      error: 'Failed to list documents',
      details: error.message 
    });
  }
});

// Get full document content
app.get('/api/documents/:documentId/content', (req, res) => {
  try {
    const { documentId } = req.params;
    console.log(`🔍 Requesting content for document ID: ${documentId}`);
    
    const documentData = uploadedDocuments.get(documentId);
    
    if (!documentData) {
      console.log(`❌ Document not found: ${documentId}`);
      console.log(`📋 Available documents: ${Array.from(uploadedDocuments.keys())}`);
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log(`✅ Found document: ${documentData.originalName} with ${documentData.extractedText.length} characters`);

    res.json({
      success: true,
      document: {
        id: documentId,
        originalName: documentData.originalName,
        content: documentData.extractedText,
        metadata: {
          wordCount: documentData.wordCount,
          characterCount: documentData.characterCount,
          uploadedAt: documentData.uploadedAt,
          type: documentData.mimetype
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to get document content:', error);
    res.status(500).json({ 
      error: 'Failed to get document content',
      details: error.message 
    });
  }
});

// Get document metadata only (without full content)
app.get('/api/documents/:documentId/metadata', (req, res) => {
  try {
    const { documentId } = req.params;
    const documentData = uploadedDocuments.get(documentId);
    
    if (!documentData) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      document: {
        id: documentId,
        originalName: documentData.originalName,
        filename: documentData.filename,
        mimetype: documentData.mimetype,
        size: documentData.size,
        wordCount: documentData.wordCount,
        characterCount: documentData.characterCount,
        uploadedAt: documentData.uploadedAt
      }
    });
  } catch (error) {
    console.error('❌ Failed to get document metadata:', error);
    res.status(500).json({ 
      error: 'Failed to get document metadata',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Vocastant Backend running on port ${PORT}`);
  console.log(`🌐 LiveKit URL: ${livekitUrl}`);
  console.log(`🔑 API Key configured: ${apiKey ? 'Yes' : 'No'}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});
