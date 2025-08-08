import { ConnectionDetails } from '../types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

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
  // Legacy method - kept for compatibility but uses roomService now
  async getConnectionDetails(): Promise<ConnectionDetails> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: 'voice-chat-room',
          participantName: 'user',
          ttl: 3600
        }),
      })

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        server_url: data.livekitUrl,
        room_name: data.roomName,
        participant_token: data.token,
        participant_name: data.participantName
      }
    } catch (error) {
      console.error('Failed to get token:', error)
      throw error
    }
  }

  // Document management methods
  async uploadDocument(file: File): Promise<DocumentUpload> {
    try {
      const formData = new FormData()
      formData.append('document', file)

      const response = await fetch(`${BACKEND_URL}/api/documents`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Document upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.document
    } catch (error) {
      console.error('Failed to upload document:', error)
      throw error
    }
  }

  async getDocuments(): Promise<DocumentUpload[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/documents`)

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`)
      }

      const data = await response.json()
      return data.documents
    } catch (error) {
      console.error('Failed to get documents:', error)
      throw error
    }
  }

  async analyzeDocument(documentId: string, question?: string): Promise<DocumentAnalysis> {
    try {
      const url = new URL(`${BACKEND_URL}/api/documents/${documentId}/analyze`)
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

  async getDocumentContent(documentId: string): Promise<{
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
      const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}/content`)

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
}

export const apiService = new ApiService() 