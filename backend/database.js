const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'vocastant',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

// Test database connection
pool.on('connect', () => {
  console.log('📊 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL client error:', err);
  process.exit(-1);
});

// Database query helper
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed:', { text: text.substring(0, 50), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Database helper functions
const db = {
  // Room operations
  async createRoom(roomName) {
    try {
      // First try to get existing room
      const existingRoom = await query('SELECT * FROM rooms WHERE name = $1', [roomName]);
      if (existingRoom.rows[0]) {
        // Update existing room
        const result = await query(
          'UPDATE rooms SET updated_at = CURRENT_TIMESTAMP WHERE name = $1 RETURNING *',
          [roomName]
        );
        return result.rows[0];
      } else {
        // Create new room
        const result = await query(
          'INSERT INTO rooms (name) VALUES ($1) RETURNING *',
          [roomName]
        );
        return result.rows[0];
      }
    } catch (error) {
      console.error('Error in createRoom:', error);
      throw error;
    }
  },

  async getRoom(roomName) {
    const result = await query('SELECT * FROM rooms WHERE name = $1', [roomName]);
    return result.rows[0];
  },

  async deleteRoom(roomId) {
    // Delete room (documents will be cascade deleted due to foreign key constraints)
    const result = await query('DELETE FROM rooms WHERE id = $1 RETURNING *', [roomId]);
    return result.rows[0];
  },

  async updateRoomParticipantCount(roomId, count) {
    await query('UPDATE rooms SET participant_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [count, roomId]);
  },

  // Document operations
  async createDocument(roomId, documentData) {
    const result = await query(`
      INSERT INTO documents (room_id, original_name, filename, s3_key, mimetype, size, extracted_text, word_count, character_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      roomId,
      documentData.originalName,
      documentData.filename,
      documentData.s3Key,
      documentData.mimetype,
      documentData.size,
      documentData.extractedText,
      documentData.wordCount,
      documentData.characterCount,
      documentData.status || 'ready'
    ]);
    return result.rows[0];
  },

  async getDocumentsByRoom(roomId) {
    const result = await query(
      'SELECT * FROM documents WHERE room_id = $1 ORDER BY uploaded_at DESC',
      [roomId]
    );
    return result.rows;
  },

  async getDocument(documentId, roomId = null) {
    const queryText = roomId 
      ? 'SELECT * FROM documents WHERE id = $1 AND room_id = $2'
      : 'SELECT * FROM documents WHERE id = $1';
    const params = roomId ? [documentId, roomId] : [documentId];
    
    const result = await query(queryText, params);
    return result.rows[0];
  },

  async deleteDocument(documentId, roomId) {
    const result = await query(
      'DELETE FROM documents WHERE id = $1 AND room_id = $2 RETURNING *',
      [documentId, roomId]
    );
    return result.rows[0];
  },

  // Message operations (optional - for persistence)
  async createMessage(roomId, messageData) {
    const result = await query(`
      INSERT INTO messages (room_id, content, role, is_voice, is_transcription, participant_identity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      roomId,
      messageData.content,
      messageData.role,
      messageData.isVoice || false,
      messageData.isTranscription || false,
      messageData.participantIdentity
    ]);
    return result.rows[0];
  },

  async getMessagesByRoom(roomId, limit = 50) {
    const result = await query(
      'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT $2',
      [roomId, limit]
    );
    return result.rows.reverse(); // Return in chronological order
  },

  // Participant operations
  async addParticipant(roomId, participantIdentity) {
    // Check if participant is already active in this room
    const existing = await query(`
      SELECT id FROM room_participants 
      WHERE room_id = $1 AND participant_identity = $2 AND is_active = true
    `, [roomId, participantIdentity]);
    
    if (existing.rows.length === 0) {
      // Insert new participant if not already active
      await query(`
        INSERT INTO room_participants (room_id, participant_identity)
        VALUES ($1, $2)
      `, [roomId, participantIdentity]);
    }
  },

  async removeParticipant(roomId, participantIdentity) {
    await query(`
      UPDATE room_participants 
      SET left_at = CURRENT_TIMESTAMP, is_active = false
      WHERE room_id = $1 AND participant_identity = $2 AND is_active = true
    `, [roomId, participantIdentity]);
  },

  async getRoomParticipants(roomId) {
    const result = await query(`
      SELECT * FROM room_participants 
      WHERE room_id = $1 AND is_active = true
      ORDER BY joined_at ASC
    `, [roomId]);
    return result.rows;
  },

  async createDocument(documentData) {
    const { originalName, s3Key, mimetype, size, extractedText, roomId } = documentData;
    
    // Calculate word and character counts
    const wordCount = extractedText ? extractedText.split(/\s+/).filter(word => word.length > 0).length : 0;
    const characterCount = extractedText ? extractedText.length : 0;
    
    const result = await query(`
      INSERT INTO documents (room_id, original_name, filename, s3_key, mimetype, size, extracted_text, word_count, character_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ready')
      RETURNING *
    `, [roomId, originalName, originalName, s3Key, mimetype, size, extractedText, wordCount, characterCount]);
    
    return result.rows[0];
  },

  async getRoomDocuments(roomId) {
    const result = await query(`
      SELECT * FROM documents 
      WHERE room_id = $1 AND status = 'ready'
      ORDER BY uploaded_at DESC
    `, [roomId]);
    return result.rows;
  },

  async getDocument(documentId, roomId) {
    const result = await query(`
      SELECT * FROM documents 
      WHERE id = $1 AND room_id = $2 AND status = 'ready'
    `, [documentId, roomId]);
    return result.rows[0];
  },

  async getDocumentById(documentId) {
    const result = await query(`
      SELECT * FROM documents 
      WHERE id = $1 AND status = 'ready'
    `, [documentId]);
    return result.rows[0];
  },

  async deleteDocument(documentId, roomId) {
    const result = await query(`
      DELETE FROM documents 
      WHERE id = $1 AND room_id = $2
      RETURNING *
    `, [documentId, roomId]);
    return result.rows[0];
  },

  async cleanupRoomDocuments(roomId) {
    // Delete all documents for a room
    const result = await query(`
      DELETE FROM documents 
      WHERE room_id = $1
      RETURNING *
    `, [roomId]);
    return result.rows;
  },

  async deactivateRoom(roomName) {
    // Mark room as inactive and cleanup documents
    const result = await query(`
      UPDATE rooms 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE name = $1
      RETURNING *
    `, [roomName]);
    
    if (result.rows[0]) {
      // Cleanup documents for this room
      await this.cleanupRoomDocuments(result.rows[0].id);
    }
    
    return result.rows[0];
  },

  async getAllDocuments() {
    const result = await query(`
      SELECT * FROM documents 
      WHERE status = 'ready'
      ORDER BY uploaded_at DESC
    `);
    return result.rows;
  }
};

// Initialize database tables (run migrations)
const initDatabase = async () => {
  try {
    // Check if tables exist, if not run the schema
    const result = await query("SELECT to_regclass('public.rooms')");
    if (!result.rows[0].to_regclass) {
      console.log('🔄 Database tables not found, initializing schema...');
      
      // Create tables automatically
      await query(`
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Rooms table - each LiveKit room
        CREATE TABLE IF NOT EXISTS rooms (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          participant_count INTEGER DEFAULT 0
        );
        
        -- Documents table - room-scoped with proper cleanup
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
          original_name VARCHAR(255) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          s3_key VARCHAR(255) NOT NULL,
          mimetype VARCHAR(100) NOT NULL,
          size BIGINT NOT NULL,
          extracted_text TEXT,
          word_count INTEGER,
          character_count INTEGER,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'processing'
        );
        
        -- Messages table for chat history
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          role VARCHAR(20) NOT NULL,
          is_voice BOOLEAN DEFAULT false,
          is_transcription BOOLEAN DEFAULT false,
          participant_identity VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Room participants tracking
        CREATE TABLE IF NOT EXISTS room_participants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
          participant_identity VARCHAR(255) NOT NULL,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          left_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true
        );
      `);
      
      console.log('✅ Database schema initialized successfully');
    } else {
      console.log('✅ Database tables exist');
      
      // Check if the unique constraint exists on rooms.name
      try {
        await query("SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'rooms_name_key' AND table_name = 'rooms'");
      } catch (error) {
        console.log('🔄 Adding missing unique constraint to rooms table...');
        await query('ALTER TABLE rooms ADD CONSTRAINT rooms_name_key UNIQUE (name)');
        console.log('✅ Unique constraint added to rooms table');
      }
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error; // Re-throw to prevent the app from starting with a broken database
  }
};

module.exports = {
  pool,
  query,
  db,
  initDatabase
};