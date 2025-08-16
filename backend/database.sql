-- Vocastant Database Schema for Multi-User Support

-- Create database (run this separately if needed)
-- CREATE DATABASE vocastant;

-- Connect to vocastant database
\c vocastant;

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

-- Documents table - documents are now scoped to rooms
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL, -- S3 key
    s3_key VARCHAR(255) NOT NULL, -- S3 object key
    mimetype VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    extracted_text TEXT,
    word_count INTEGER,
    character_count INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
    
    -- Indexes
    UNIQUE(room_id, original_name), -- Prevent duplicate filenames in same room
    INDEX idx_documents_room_id (room_id),
    INDEX idx_documents_status (status),
    INDEX idx_documents_uploaded_at (uploaded_at)
);

-- Messages table for chat history (optional - for persistence)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    is_voice BOOLEAN DEFAULT false,
    is_transcription BOOLEAN DEFAULT false,
    participant_identity VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_messages_room_id (room_id),
    INDEX idx_messages_created_at (created_at)
);

-- Room participants tracking (optional - for analytics)
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    participant_identity VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Indexes
    INDEX idx_participants_room_id (room_id),
    INDEX idx_participants_identity (participant_identity),
    UNIQUE(room_id, participant_identity, joined_at)
);

-- Update room updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_room_timestamp 
    BEFORE UPDATE ON rooms 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_room_timestamp();

-- Sample data (optional)
-- INSERT INTO rooms (name) VALUES ('demo-room');