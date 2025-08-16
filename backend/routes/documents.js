const express = require('express');
const { db } = require('../database');
const { s3Helper, upload } = require('../s3');
const { extractTextFromFile } = require('../utils/textExtractor');
const { getRoomMiddleware } = require('../middleware/roomMiddleware');

const router = express.Router();

// Simple documents list endpoint for backward compatibility (no room validation)
// This allows the agent to access all documents across rooms
router.get('/', async (req, res) => {
  try {
    console.log('🤖 Agent requesting all documents (simple list)');

    // Get all documents without room validation
    const documents = await db.getAllDocuments();
    
    console.log(`📚 Agent found ${documents.length} total documents`);

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        originalName: doc.original_name,
        size: doc.size,
        type: doc.mimetype,
        uploadedAt: doc.uploaded_at,
        wordCount: doc.word_count,
        characterCount: doc.character_count
      }))
    });

  } catch (error) {
    console.error('❌ Failed to get all documents:', error);
    res.status(500).json({ 
      error: 'Failed to get documents',
      details: error.message 
    });
  }
});

// Agent-specific document access endpoint (room-scoped)
// This must be defined BEFORE other document routes to avoid conflicts
router.get('/:documentId/agent-content', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { roomName } = req.query; // Get room name from query params
    
    if (!roomName) {
      return res.status(400).json({ 
        error: 'Room name is required',
        details: 'Please provide roomName as a query parameter'
      });
    }

    // First get the room to ensure it exists
    const room = await db.getRoom(roomName);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get document with room validation for agent access
    const document = await db.getDocument(documentId, room.id);
    if (!document) {
      return res.status(404).json({ 
        error: 'Document not found',
        details: 'Document not found in the specified room'
      });
    }

    console.log('🤖 Agent accessing document:', document.original_name, 'in room:', roomName);

    res.json({
      success: true,
      document: {
        id: document.id,
        originalName: document.original_name,
        content: document.extracted_text,
        extractedText: document.extracted_text, // Keep both for compatibility
        metadata: {
          wordCount: document.word_count,
          characterCount: document.character_count,
          uploadedAt: document.uploaded_at,
          type: document.mimetype
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get document content for agent:', error);
    res.status(500).json({ 
      error: 'Failed to get document content',
      details: error.message 
    });
  }
});

// Simple document access endpoint for backward compatibility (no room validation)
// This allows the agent to access documents without room constraints
router.get('/:documentId/simple-content', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    console.log('🤖 Agent accessing document (simple):', documentId);

    // Get document without room validation
    const document = await db.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({ 
        error: 'Document not found',
        details: 'Document not found in the system'
      });
    }

    console.log('🤖 Agent successfully accessed document:', document.original_name);

    res.json({
      success: true,
      document: {
        id: document.id,
        originalName: document.original_name,
        content: document.extracted_text,
        extractedText: document.extracted_text, // Keep both for compatibility
        metadata: {
          wordCount: document.word_count,
          characterCount: document.character_count,
          uploadedAt: document.uploaded_at,
          type: document.mimetype
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get document content (simple):', error);
    res.status(500).json({ 
      error: 'Failed to get document content',
      details: error.message 
    });
  }
});

// Get document content (room-scoped)
router.get('/:documentId/content', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { roomName } = req.query; // Get room name from query params
    
    if (!roomName) {
      return res.status(400).json({ 
        error: 'Room name is required',
        details: 'Please provide roomName as a query parameter'
      });
    }

    // First get the room to ensure it exists
    const room = await db.getRoom(roomName);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get document with room validation
    const document = await db.getDocument(documentId, room.id);
    if (!document) {
      return res.status(404).json({ 
        error: 'Document not found',
        details: 'Document not found in the specified room'
      });
    }

    console.log('📖 Serving content for:', document.original_name, 'in room:', roomName);

    res.json({
      success: true,
      document: {
        id: document.id,
        originalName: document.original_name,
        content: document.extracted_text,
        extractedText: document.extracted_text, // Keep both for compatibility
        metadata: {
          wordCount: document.word_count,
          characterCount: document.character_count,
          uploadedAt: document.uploaded_at,
          type: document.mimetype
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

// View document (presigned S3 URL for iframe) - now room-scoped
router.get('/:documentId/view', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { roomName } = req.query; // Get room name from query params
    
    if (!roomName) {
      return res.status(400).json({ 
        error: 'Room name is required',
        details: 'Please provide roomName as a query parameter'
      });
    }

    // First get the room to ensure it exists
    const room = await db.getRoom(roomName);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get document with room validation
    const document = await db.getDocument(documentId, room.id);
    if (!document) {
      return res.status(404).json({ 
        error: 'Document not found',
        details: 'Document not found in the specified room'
      });
    }

    console.log('👁️ Generating view URL for:', document.original_name, 'in room:', roomName);

    // Generate presigned URL for viewing
    const viewUrl = await s3Helper.getPresignedUrl(document.s3_key, 3600); // 1 hour expiry
    
    // Redirect to S3 presigned URL
    res.redirect(viewUrl);

  } catch (error) {
    console.error('❌ Failed to generate view URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate view URL',
      details: error.message 
    });
  }
});

// Download document (presigned S3 URL) - now room-scoped
router.get('/:documentId/download', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { roomName } = req.query; // Get room name from query params
    
    if (!roomName) {
      return res.status(400).json({ 
        error: 'Room name is required',
        details: 'Please provide roomName as a query parameter'
      });
    }

    // First get the room to ensure it exists
    const room = await db.getRoom(roomName);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get document with room validation
    const document = await db.getDocument(documentId, room.id);
    if (!document) {
      return res.status(404).json({ 
        error: 'Document not found',
        details: 'Document not found in the specified room'
      });
    }

    console.log('⬇️ Generating download URL for:', document.original_name, 'in room:', roomName);

    // Generate presigned URL for download
    const downloadUrl = await s3Helper.getPresignedUrl(document.s3_key, 3600, 'attachment'); // 1 hour expiry
    
    // Redirect to S3 presigned URL
    res.redirect(downloadUrl);

  } catch (error) {
    console.error('❌ Failed to generate download URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate download URL',
      details: error.message 
    });
  }
});

// Upload document to a specific room
router.post('/upload', async (req, res) => {
  try {
    // Use multer upload middleware first to process the multipart form data
    upload.single('document')(req, res, async (err) => {
      if (err) {
        console.error('❌ Upload error:', err);
        return res.status(400).json({ 
          error: 'Upload failed',
          details: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          details: 'Please select a file to upload'
        });
      }

      // Now get roomName from req.body after multer has processed it
      const { roomName } = req.body;
      
      if (!roomName) {
        return res.status(400).json({ 
          error: 'Room name is required',
          details: 'Please provide roomName in the form data'
        });
      }

      try {
        // First get the room to ensure it exists and is active
        const room = await db.getRoom(roomName);
        if (!room) {
          return res.status(404).json({ error: 'Room not found' });
        }

        if (!room.is_active) {
          return res.status(400).json({ error: 'Room is not active' });
        }

        console.log('📁 File uploaded:', req.file.originalname, 'for room:', roomName);
        console.log('🔑 S3 key:', req.file.key);

        // Extract text from the uploaded file
        const extractedText = await extractTextFromFile(s3Helper, req.file.key, req.file.mimetype);
        
        // Save document to database with room ID
        const document = await db.createDocument({
          originalName: req.file.originalname,
          s3Key: req.file.key,
          mimetype: req.file.mimetype,
          size: req.file.size,
          extractedText: extractedText,
          roomId: room.id
        });

        console.log('✅ Document saved to database:', document.original_name, 'for room:', roomName);

        res.json({
          success: true,
          message: 'Document uploaded successfully',
          document: {
            id: document.id,
            originalName: document.original_name,
            size: document.size,
            type: document.mimetype,
            uploadedAt: document.uploaded_at,
            wordCount: document.word_count,
            characterCount: document.character_count
          }
        });

      } catch (error) {
        console.error('❌ Failed to process uploaded file:', error);
        
        // Clean up S3 file if database save failed
        try {
          await s3Helper.deleteFile(req.file.key);
          console.log('🧹 Cleaned up S3 file after database error');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup S3 file:', cleanupError);
        }

        res.status(500).json({ 
          error: 'Failed to process uploaded file',
          details: error.message 
        });
      }
    });

  } catch (error) {
    console.error('❌ Failed to handle upload request:', error);
    res.status(500).json({ 
      error: 'Upload request failed',
      details: error.message 
    });
  }
});

// Get all documents for a specific room
router.get('/room/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    
    // First get the room to ensure it exists
    const room = await db.getRoom(roomName);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get documents for the specific room
    const documents = await db.getRoomDocuments(room.id);
    
    console.log(`📚 Found ${documents.length} documents for room: ${roomName}`);

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        originalName: doc.original_name,
        size: doc.size,
        type: doc.mimetype,
        uploadedAt: doc.uploaded_at,
        wordCount: doc.word_count,
        characterCount: doc.character_count
      }))
    });

  } catch (error) {
    console.error('❌ Failed to get room documents:', error);
    res.status(500).json({ 
      error: 'Failed to get room documents',
      details: error.message 
    });
  }
});

// Delete document (room-scoped)
router.delete('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { roomName } = req.query; // Get room name from query params
    
    if (!roomName) {
      return res.status(400).json({ 
        error: 'Room name is required',
        details: 'Please provide roomName as a query parameter'
      });
    }

    // First get the room to ensure it exists
    const room = await db.getRoom(roomName);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get document with room validation
    const document = await db.getDocument(documentId, room.id);
    if (!document) {
      return res.status(404).json({ 
        error: 'Document not found',
        details: 'Document not found in the specified room'
      });
    }

    console.log('🗑️ Deleting document:', document.original_name, 'from room:', roomName);

    // Delete from S3 first
    try {
      await s3Helper.deleteFile(document.s3_key);
      console.log('🗑️ Deleted from S3:', document.s3_key);
    } catch (s3Error) {
      console.warn('⚠️ Failed to delete from S3 (continuing with DB deletion):', s3Error);
    }

    // Delete from database
    const deletedDocument = await db.deleteDocument(documentId, room.id);
    if (!deletedDocument) {
      return res.status(500).json({ 
        error: 'Failed to delete document',
        details: 'Database deletion failed'
      });
    }

    console.log('🗑️ Deleted document from database:', deletedDocument.original_name);

    res.json({
      success: true,
      message: 'Document deleted successfully',
      document: {
        id: deletedDocument.id,
        originalName: deletedDocument.original_name
      }
    });

  } catch (error) {
    console.error('❌ Failed to delete document:', error);
    res.status(500).json({ 
      error: 'Failed to delete document',
      details: error.message 
    });
  }
});

module.exports = router;
