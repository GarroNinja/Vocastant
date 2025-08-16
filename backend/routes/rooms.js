const express = require('express');
const { db } = require('../database');
const { getRoomMiddleware } = require('../middleware/roomMiddleware');
const LiveKitService = require('../services/livekitService');
const { upload, s3Helper } = require('../s3');

const router = express.Router();
// Lazy initialization of LiveKit service to avoid credential check on import
let livekitService = null;

const getLiveKitService = () => {
  if (!livekitService) {
    livekitService = new LiveKitService();
  }
  return livekitService;
};

// Create or join a room
router.post('/', async (req, res) => {
  try {
    const { roomName, participantIdentity, participantName } = req.body;
    
    if (!participantIdentity) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'participantIdentity is required'
      });
    }

    // Generate room name if not provided
    const finalRoomName = roomName || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('🏠 Creating/joining room:', finalRoomName, 'for participant:', participantIdentity);

    // Create room in database
    const room = await db.createRoom(finalRoomName);
    if (!room) {
      return res.status(500).json({ 
        error: 'Failed to create room',
        details: 'Database operation failed'
      });
    }

    // Create LiveKit room
    try {
      await getLiveKitService().createRoom(finalRoomName);
    } catch (livekitError) {
      console.warn('⚠️ LiveKit room creation failed (continuing with DB room):', livekitError);
    }

    // Generate access token
    const token = getLiveKitService().generateToken(finalRoomName, participantIdentity, participantName);

    // Add participant to room
    await db.addParticipant(room.id, participantIdentity);

    console.log('✅ Room created/joined successfully:', roomName);

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        createdAt: room.created_at
      },
      participant: {
        identity: participantIdentity,
        name: participantName || participantIdentity
      },
      token: token,
      livekitUrl: getLiveKitService().livekitUrl
    });

  } catch (error) {
    console.error('❌ Failed to create/join room:', error);
    res.status(500).json({ 
      error: 'Failed to create/join room',
      details: error.message 
    });
  }
});

// Cleanup room and all its documents (when room becomes inactive)
router.delete('/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    
    console.log('🧹 Cleaning up room:', roomName);
    
    // Deactivate room and cleanup documents
    const deactivatedRoom = await db.deactivateRoom(roomName);
    if (!deactivatedRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log('✅ Room deactivated and documents cleaned up:', roomName);
    
    res.json({
      success: true,
      message: 'Room deactivated and documents cleaned up successfully',
      room: {
        name: deactivatedRoom.name,
        isActive: deactivatedRoom.is_active
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to cleanup room:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup room',
      details: error.message 
    });
  }
});

// List documents for a room
router.get('/:roomName/documents', getRoomMiddleware, async (req, res) => {
  try {
    const { room } = req;
    const documents = await db.getDocumentsByRoom(room.id);

    console.log(`📋 Listing ${documents.length} documents for room: ${room.name}`);

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      originalName: doc.original_name,
      size: doc.size,
      wordCount: doc.word_count,
      characterCount: doc.character_count,
      uploadedAt: doc.uploaded_at,
      type: doc.mimetype,
      status: doc.status
    }));

    res.json({
      success: true,
      documents: formattedDocuments
    });

  } catch (error) {
    console.error('❌ Failed to list documents:', error);
    res.status(500).json({ 
      error: 'Failed to list documents',
      details: error.message 
    });
  }
});

// Upload document to a room
router.post('/:roomName/documents', getRoomMiddleware, async (req, res) => {
  try {
    const { room } = req;
    
    // Handle file upload using multer
    const uploadMiddleware = upload.single('document');
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error('❌ Upload middleware error:', err);
        return res.status(400).json({ 
          error: 'Upload failed',
          details: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file provided',
          details: 'Please upload a document file'
        });
      }

      try {
        const { extractTextFromFile } = require('../utils/textExtractor');
        
        // Extract text from the uploaded file
        const extractedText = await extractTextFromFile(s3Helper, req.file.s3Key, req.file.mimetype);
        
        // Calculate word and character counts
        const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        const characterCount = extractedText.length;

        // Create document record in database
        const documentData = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          s3Key: req.file.s3Key,
          mimetype: req.file.mimetype,
          size: req.file.size,
          extractedText: extractedText,
          wordCount: wordCount,
          characterCount: characterCount,
          status: 'ready'
        };

        const document = await db.createDocument(room.id, documentData);
        
        if (!document) {
          return res.status(500).json({ 
            error: 'Failed to create document record',
            details: 'Database operation failed'
          });
        }

        console.log('📄 Document uploaded successfully:', document.original_name, 'to room:', room.name);

        res.json({
          success: true,
          message: 'Document uploaded successfully',
          document: {
            id: document.id,
            originalName: document.original_name,
            filename: document.filename,
            size: document.size,
            wordCount: document.word_count,
            characterCount: document.character_count,
            type: document.mimetype,
            status: document.status,
            uploadedAt: document.uploaded_at
          }
        });

      } catch (uploadError) {
        console.error('❌ Document processing error:', uploadError);
        res.status(500).json({ 
          error: 'Failed to process document',
          details: uploadError.message 
        });
      }
    });

  } catch (error) {
    console.error('❌ Upload failed:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      details: error.message 
    });
  }
});

// Get all documents with content for agent context
router.get('/:roomName/context', getRoomMiddleware, async (req, res) => {
  try {
    const { room } = req;
    const documents = await db.getDocumentsByRoom(room.id);
    
    if (documents.length === 0) {
      return res.json({
        success: true,
        message: 'No documents uploaded',
        context: 'The user has not uploaded any documents to analyze or discuss.'
      });
    }

    // Build context string from all documents
    let context = `Documents available for analysis:\n\n`;
    
    for (const doc of documents) {
      context += `Document: ${doc.original_name}\n`;
      context += `Type: ${doc.mimetype}\n`;
      context += `Size: ${doc.word_count} words, ${doc.character_count} characters\n`;
      context += `Content:\n${doc.extracted_text}\n\n---\n\n`;
    }

    res.json({
      success: true,
      documentCount: documents.length,
      context: context,
      documents: documents.map(doc => ({
        id: doc.id,
        name: doc.original_name,
        type: doc.mimetype,
        wordCount: doc.word_count,
        characterCount: doc.character_count
      }))
    });

  } catch (error) {
    console.error('❌ Failed to get room context:', error);
    res.status(500).json({ 
      error: 'Failed to get room context',
      details: error.message 
    });
  }
});

// Leave room (remove participant)
router.post('/:roomName/leave', getRoomMiddleware, async (req, res) => {
  try {
    const { room } = req;
    const { participantIdentity } = req.body;
    
    if (!participantIdentity) {
      return res.status(400).json({ 
        error: 'Missing participant identity',
        details: 'participantIdentity is required'
      });
    }

    console.log('👋 Participant leaving room:', participantIdentity, 'from room:', room.name);

    // Remove participant from room
    await db.removeParticipant(room.id, participantIdentity);

    // Update participant count
    const currentParticipants = await db.getRoomParticipants(room.id);
    await db.updateRoomParticipantCount(room.id, currentParticipants.length);

    res.json({
      success: true,
      message: 'Successfully left room',
      room: {
        id: room.id,
        name: room.name
      }
    });

  } catch (error) {
    console.error('❌ Failed to leave room:', error);
    res.status(500).json({ 
      error: 'Failed to leave room',
      details: error.message 
    });
  }
});

// Delete room
router.delete('/:roomName', getRoomMiddleware, async (req, res) => {
  try {
    const { room } = req;
    
    console.log('🗑️ Deleting room:', room.name);

    // Delete LiveKit room
    try {
      await getLiveKitService().deleteRoom(room.name);
    } catch (livekitError) {
      console.warn('⚠️ LiveKit room deletion failed (continuing with DB deletion):', livekitError);
    }

    // Delete room from database (documents will be cascade deleted)
    const deletedRoom = await db.deleteRoom(room.id);
    if (!deletedRoom) {
      return res.status(500).json({ 
        error: 'Failed to delete room',
        details: 'Database operation failed'
      });
    }

    console.log('✅ Room deleted successfully:', room.name);

    res.json({
      success: true,
      message: 'Room deleted successfully',
      room: {
        id: deletedRoom.id,
        name: deletedRoom.name
      }
    });

  } catch (error) {
    console.error('❌ Failed to delete room:', error);
    res.status(500).json({ 
      error: 'Failed to delete room',
      details: error.message 
    });
  }
});

module.exports = router;
