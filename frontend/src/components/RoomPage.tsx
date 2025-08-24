import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, PhoneOff, Upload, FileText, Maximize2, Minimize2 } from 'lucide-react'
import { LiveKitProvider } from './LiveKitProvider'
import { ModernDocumentUpload } from './ModernDocumentUpload'
import { 
  VoiceAssistantControlBar, 
  useRoomContext,
  useVoiceAssistant
} from '@livekit/components-react'
import { TranscriptionDisplay } from './TranscriptionDisplay'
import { useAppStore } from '../store/useAppStore'
import { apiService } from '../services/api'

// Import the Document type from types/index.ts instead of defining locally
import type { Document } from '../types'

// Voice Assistant Panel Component
const VoiceAssistantPanel: React.FC = () => {
  const room = useRoomContext()
  const { voiceAssistant } = useVoiceAssistant()

  return (
    <div className="bg-gray-800/60 border border-lime-500/20 backdrop-blur-sm rounded-lg p-4">
      <h3 className="text-white font-medium mb-4 flex items-center gap-2">
        <Mic className="h-4 w-4 text-lime-400" />
        Voice Assistant
      </h3>
      
      {room && (
        <div className="space-y-4">
          <VoiceAssistantControlBar />
          
          {/* Show current status */}
          <div className="text-sm text-lime-300">
            {voiceAssistant?.state === 'listening' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
                Listening...
              </div>
            )}
            {voiceAssistant?.state === 'thinking' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Processing...
              </div>
            )}
            {voiceAssistant?.state === 'speaking' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Speaking...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { documents, setDocuments } = useAppStore()
  
  const [isMuted, setIsMuted] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [isDocumentMaximized, setIsDocumentMaximized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Initialize room and load documents
  useEffect(() => {
    if (roomId) {
      // Set room context in API service
      apiService.setRoomContext(roomId)
      
      // Load existing documents for this room
      loadRoomDocuments()
      
      // Check if we already have a valid LiveKit config from StartPage
      const existingConfig = localStorage.getItem('livekit-config')
      if (!existingConfig) {
        console.warn('⚠️ No LiveKit config found - user should start from StartPage')
        setLoadError('No room configuration found. Please start from the home page.')
        setIsLoading(false)
        setTimeout(() => navigate('/'), 3000)
        return
      }
      
      // Verify the config is for the current room
      try {
        const config = JSON.parse(existingConfig)
        if (config.roomName !== roomId) {
          console.warn('⚠️ Room mismatch - redirecting to StartPage')
          setLoadError(`Room mismatch. Expected: ${roomId}, Found: ${config.roomName}`)
          setIsLoading(false)
          setTimeout(() => navigate('/'), 3000)
          return
        }
        console.log('✅ Using existing LiveKit config for room:', roomId)
        setIsLoading(false)
      } catch (error) {
        console.error('❌ Invalid LiveKit config:', error)
        setLoadError('Invalid room configuration. Please start from the home page.')
        setIsLoading(false)
        setTimeout(() => navigate('/'), 3000)
        return
      }
    }
  }, [roomId, navigate])

  const loadRoomDocuments = async () => {
    try {
      if (!roomId) return
      
      const backendDocuments = await apiService.getDocuments(roomId)
      
      const convertedDocs: Document[] = backendDocuments.map(doc => ({
        id: doc.id,
        name: doc.originalName,
        type: convertMimeTypeToSimpleType(doc.type),
        mimeType: doc.type,
        size: parseInt(doc.size.toString()), // Ensure it's a number
        uploadedAt: new Date(doc.uploadedAt),
        status: 'ready' as const
      }))
      
      setDocuments(convertedDocs)
      
      // Auto-select first document if available
      if (convertedDocs.length > 0 && !selectedDocument) {
        const firstDoc: Document = convertedDocs[0]
        setSelectedDocument(firstDoc)
      }
    } catch (error) {
      console.error('Failed to load room documents:', error)
    }
  }

  const convertMimeTypeToSimpleType = (mimeType: string): 'pdf' | 'docx' | 'txt' | 'md' => {
    switch (mimeType) {
      case 'application/pdf':
        return 'pdf'
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'docx'
      case 'text/plain':
        return 'txt'
      case 'text/markdown':
        return 'md'
      default:
        if (mimeType.includes('pdf')) return 'pdf'
        if (mimeType.includes('word') || mimeType.includes('docx')) return 'docx'
        if (mimeType.includes('text')) return 'txt'
        return 'txt'
    }
  }

  const handleDisconnect = () => {
    navigate('/')
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const getDocumentViewUrl = (doc: Document) => {
    if (!roomId) return ''
    return `${apiService.getBaseUrl()}/api/documents/${doc.id}/view?roomName=${roomId}`
  }

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Room</h1>
          <button 
            onClick={() => navigate('/')} 
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-white text-xl font-semibold mb-2">Joining Room...</h2>
          <p className="text-lime-300">Setting up your voice connection</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-gray-300 mb-4">{loadError}</p>
          <p className="text-lime-300 text-sm">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  return (
    <LiveKitProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
        {/* Header with room info */}
        <header className="bg-black/40 border-b border-lime-500/20 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-lime-400 rounded-full animate-pulse" />
                <span className="text-white font-medium">Room: {roomId}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-lime-200">
              <span className="text-sm">Vocastant AI Assistant</span>
            </div>
          </div>
        </header>

        {/* Main content area - Google Meet style */}
        <div className="flex-1 flex min-h-0">
          {/* Main content area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Document viewer area (replaces video) */}
            <div className={`${isDocumentMaximized ? 'flex-1' : 'flex-1'} bg-gray-800/50 border border-lime-500/20 rounded-lg overflow-hidden relative`}>
              {selectedDocument ? (
                <div className="h-full flex flex-col">
                  {/* Document header */}
                  <div className="bg-gray-800/80 border-b border-lime-500/20 px-4 py-2 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-white">
                      <FileText className="h-4 w-4 text-lime-400" />
                      <span className="text-sm font-medium">{selectedDocument.name}</span>
                    </div>
                    <button
                      onClick={() => setIsDocumentMaximized(!isDocumentMaximized)}
                      className="text-lime-300 hover:text-lime-400 p-1 rounded transition-colors hover:bg-lime-500/20"
                    >
                      {isDocumentMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Document content */}
                  <div className="flex-1 bg-white border border-lime-500/10">
                    <iframe
                      src={getDocumentViewUrl(selectedDocument)}
                      className="w-full h-full border-none"
                      title={selectedDocument.name}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-800/30">
                  <div className="text-center text-lime-300">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-60 text-lime-400" />
                    <p className="text-lg font-medium text-white">No Document Selected</p>
                    <p className="text-sm text-lime-300">Upload a document to get started</p>
                  </div>
                </div>
              )}
            </div>

            {/* Control bar */}
            <div className="bg-black/60 border-t border-lime-500/20 backdrop-blur-sm px-6 py-4">
              <div className="flex items-center justify-center gap-4">
                {/* Mute button */}
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg' 
                      : 'bg-lime-600/80 hover:bg-lime-500 text-black shadow-lg border border-lime-500/30'
                  }`}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                {/* Upload button */}
                <button
                  onClick={() => setShowUpload(true)}
                  className="p-3 rounded-full bg-lime-600/80 hover:bg-lime-500 text-gray-900 transition-all duration-200 shadow-lg border border-lime-500/30"
                >
                  <Upload className="h-5 w-5" />
                </button>

                {/* Disconnect button */}
                <button
                  onClick={handleDisconnect}
                  className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all duration-200 shadow-lg border border-red-500/30"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar - Voice Assistant, Transcription & Documents */}
          {!isDocumentMaximized && (
            <div className="w-80 bg-gray-800/60 border-l border-lime-500/20 backdrop-blur-sm flex flex-col min-h-0">
              {/* Voice Assistant Controls */}
              <div className="border-b border-lime-500/20 p-4">
                <VoiceAssistantPanel />
              </div>

              {/* Live Transcription */}
              <div className="border-b border-lime-500/20 h-80 flex-shrink-0">
                <TranscriptionDisplay />
              </div>

              {/* Documents list */}
              <div className="flex-shrink-0">
                <div className="p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-lime-400" />
                    Documents
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {documents.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          const docWithMimeType: Document = {
                            ...doc,
                            mimeType: doc.mimeType || doc.type
                          }
                          setSelectedDocument(docWithMimeType)
                        }}
                        className={`p-2 rounded cursor-pointer transition-all duration-200 ${
                          selectedDocument?.id === doc.id
                            ? 'bg-lime-600/80 text-black shadow-md border border-lime-500/50'
                            : 'bg-gray-700/60 hover:bg-lime-500/20 text-gray-200 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className={`h-4 w-4 ${selectedDocument?.id === doc.id ? 'text-black' : 'text-lime-400'}`} />
                          <span className="text-sm font-medium truncate">{doc.name}</span>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <div className="text-lime-300 text-sm text-center py-4">
                        No documents uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800/95 border border-lime-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Upload className="h-5 w-5 text-lime-400" />
                  Upload Document
                </h3>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-lime-300 hover:text-lime-400 hover:bg-lime-500/20 rounded p-1 transition-colors"
                >
                  ×
                </button>
              </div>
              <ModernDocumentUpload onUploadComplete={() => {
                setShowUpload(false)
                loadRoomDocuments()
              }} />
            </div>
          </div>
        )}
      </div>
    </LiveKitProvider>
  )
}

export default RoomPage