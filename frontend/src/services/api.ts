// import { ConnectionDetails } from '../types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://d1ye5bx9w8mu3e.cloudfront.net'

export interface DocumentUpload {
  id: string
  originalName: string
  size: number
  wordCount: number
  characterCount: number
  uploadedAt: string
  type: string
}

export interface DocumentAnalysis {
  documentId: string
  originalName: string
  wordCount: number
  characterCount: number
  question?: string
  extractedText: string
  fullTextAvailable: boolean
  analyzedAt: string
}

class ApiService {
  private currentRoomName: string | null = null;

  // Get the base URL for API calls
  getBaseUrl(): string {
    return BACKEND_URL;
  }

  // Set the current room context
  setRoomContext(roomName: string) {
    this.currentRoomName = roomName;
    console.log('🏠 API room context set to:', roomName);
  }

  // Get current room name from localStorage or context
  getCurrentRoomName(): string {
    if (this.currentRoomName) {
      return this.currentRoomName;
    }
    
    // Try to get room name from stored LiveKit config
    try {
      const storedConfig = localStorage.getItem('livekit-config');
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        if (config.roomName) {
          this.currentRoomName = config.roomName;
          return config.roomName;
        }
      }
    } catch (error) {
      console.warn('Could not parse stored room config:', error);
    }

    // Try to get room name from URL if in room page
    const currentPath = window.location.pathname;
    const roomMatch = currentPath.match(/\/room\/([^\/]+)/);
    if (roomMatch) {
      const roomNameFromUrl = roomMatch[1];
      this.currentRoomName = roomNameFromUrl;
      return roomNameFromUrl;
    }

    // Fallback to default room name
    console.warn('No room context found, using default room');
    return 'default-room';
  }

  // Document management methods (now room-scoped)
  async uploadDocument(file: File, roomName?: string): Promise<DocumentUpload> {
    try {
      const room = roomName || this.getCurrentRoomName();
      const formData = new FormData();
      formData.append('document', file);
      formData.append('roomName', room);

      const response = await fetch(`${BACKEND_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Document upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.document;
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  }

  async getDocuments(roomName?: string): Promise<DocumentUpload[]> {
    try {
      const room = roomName || this.getCurrentRoomName();
      const response = await fetch(`${BACKEND_URL}/api/documents/room/${encodeURIComponent(room)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();
      return data.documents;
    } catch (error) {
      console.error('Failed to get documents:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string, roomName?: string): Promise<void> {
    try {
      const room = roomName || this.getCurrentRoomName();
      const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}?roomName=${encodeURIComponent(room)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }

  // Cleanup room and all its documents
  async cleanupRoom(roomName?: string): Promise<void> {
    try {
      const room = roomName || this.getCurrentRoomName();
      const response = await fetch(`${BACKEND_URL}/api/rooms/${encodeURIComponent(room)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to cleanup room: ${response.statusText}`);
      }

      console.log('🧹 Room cleaned up successfully:', room);
    } catch (error) {
      console.error('Failed to cleanup room:', error);
      throw error;
    }
  }

  async analyzeDocument(documentId: string, question?: string, roomName?: string): Promise<DocumentAnalysis> {
    try {
      const room = roomName || this.getCurrentRoomName();
      const url = new URL(`${BACKEND_URL}/api/documents/${documentId}/analyze`)
      url.searchParams.set('roomName', room)
      if (question) {
        url.searchParams.set('question', question)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Document analysis failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.analysis
    } catch (error) {
      console.error('Failed to analyze document:', error)
      throw error
    }
  }

  async getDocumentContent(documentId: string, roomName?: string): Promise<{
    id: string
    originalName: string
    content: string
    metadata: {
      wordCount: number
      characterCount: number
      uploadedAt: string
    }
  }> {
    try {
      const room = roomName || this.getCurrentRoomName();
      const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}/agent-content?roomName=${encodeURIComponent(room)}`)

      if (!response.ok) {
        throw new Error(`Failed to get document content: ${response.statusText}`)
      }

      const data = await response.json()
      return data.document
    } catch (error) {
      console.error('Failed to get document content:', error)
      throw error
    }
  }

  // Get room context for agent (all documents with content)
  async getRoomContext(roomName: string): Promise<{
    success: boolean
    documentCount: number
    context: string
    documents: Array<{
      id: string
      name: string
      type: string
      wordCount: number
      characterCount: number
    }>
  }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/${encodeURIComponent(roomName)}/context`)

      if (!response.ok) {
        throw new Error(`Failed to get room context: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to get room context:', error)
      throw error
    }
  }
}

export const apiService = new ApiService() 