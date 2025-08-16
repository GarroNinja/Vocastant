import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, PhoneOff, Upload, FileText, Maximize2, Minimize2 } from 'lucide-react'
import { LiveKitProvider } from './LiveKitProvider'
import { ModernDocumentUpload } from './ModernDocumentUpload'
import { TranscriptionHandler } from './TranscriptionHandler'
import { useAppStore } from '../store/useAppStore'
import { apiService } from '../services/api'

// Import the Document type from types/index.ts instead of defining locally
import type { Document } from '../types'

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { documents, setDocuments, transcriptionMessages } = useAppStore()
  
  const [isMuted, setIsMuted] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [isDocumentMaximized, setIsDocumentMaximized] = useState(false)
  const transcriptionEndRef = useRef<HTMLDivElement>(null)

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
        navigate('/')
        return
      }
      
      // Verify the config is for the current room
      try {
        const config = JSON.parse(existingConfig)
        if (config.roomName !== roomId) {
          console.warn('⚠️ Room mismatch - redirecting to StartPage')
          navigate('/')
          return
        }
        console.log('✅ Using existing LiveKit config for room:', roomId)
      } catch (error) {
        console.error('❌ Invalid LiveKit config:', error)
        navigate('/')
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

  // Auto-scroll transcription to bottom when new messages arrive
  useEffect(() => {
    if (transcriptionMessages.length > 0) {
      transcriptionEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcriptionMessages])

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

  return (
    <LiveKitProvider>
      <TranscriptionHandler />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900/20 to-gray-900 flex flex-col">
        {/* Header with room info */}
        <header className="bg-black/40 border-b border-green-500/20 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-lime-400 rounded-full animate-pulse" />
                <span className="text-white font-medium">Room: {roomId}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-200">
              <span className="text-sm">Vocastant AI Assistant</span>
            </div>
          </div>
        </header>

        {/* Main content area - Google Meet style */}
        <div className="flex-1 flex min-h-0">
          {/* Main content area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Document viewer area (replaces video) */}
            <div className={`${isDocumentMaximized ? 'flex-1' : 'flex-1'} bg-gray-800/50 border border-green-500/20 rounded-lg overflow-hidden relative`}>
              {selectedDocument ? (
                <div className="h-full flex flex-col">
                  {/* Document header */}
                  <div className="bg-gray-800/80 border-b border-green-500/20 px-4 py-2 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-white">
                      <FileText className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium">{selectedDocument.name}</span>
                    </div>
                    <button
                      onClick={() => setIsDocumentMaximized(!isDocumentMaximized)}
                      className="text-green-300 hover:text-lime-400 p-1 rounded transition-colors hover:bg-green-500/20"
                    >
                      {isDocumentMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Document content */}
                  <div className="flex-1 bg-white border border-green-500/10">
                    <iframe
                      src={getDocumentViewUrl(selectedDocument)}
                      className="w-full h-full border-none"
                      title={selectedDocument.name}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-800/30">
                  <div className="text-center text-green-300">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-60 text-green-400" />
                    <p className="text-lg font-medium text-white">No Document Selected</p>
                    <p className="text-sm text-green-300">Upload a document to get started</p>
                  </div>
                </div>
              )}
            </div>

            {/* Control bar */}
            <div className="bg-black/60 border-t border-green-500/20 backdrop-blur-sm px-6 py-4">
              <div className="flex items-center justify-center gap-4">
                {/* Mute button */}
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg' 
                      : 'bg-green-600/80 hover:bg-green-500 text-white shadow-lg border border-green-500/30'
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

          {/* Right sidebar - Transcription & Documents */}
          {!isDocumentMaximized && (
            <div className="w-80 bg-gray-800/60 border-l border-green-500/20 backdrop-blur-sm flex flex-col min-h-0">
              {/* Documents list */}
              <div className="border-b border-green-500/20">
                <div className="p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-400" />
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
                            ? 'bg-green-600/80 text-white shadow-md border border-green-500/50'
                            : 'bg-gray-700/60 hover:bg-green-500/20 text-gray-200 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className={`h-4 w-4 ${selectedDocument?.id === doc.id ? 'text-white' : 'text-green-400'}`} />
                          <span className="text-sm font-medium truncate">{doc.name}</span>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <div className="text-green-300 text-sm text-center py-4">
                        No documents uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live transcription */}
              <div className="flex-1 flex flex-col min-h-0 max-h-0">
                <div className="p-4 border-b border-green-500/20 flex-shrink-0">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Mic className="h-4 w-4 text-green-400" />
                    Live Transcription
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-green-500/20 scrollbar-track-transparent">
                  <div className="p-4 space-y-3">
                    {transcriptionMessages.map(item => (
                      <div key={item.id} className={`flex ${
                        item.speaker === 'user' ? 'justify-end' : 'justify-start'
                      }`}>
                        <div className={`max-w-[85%] group ${
                          item.speaker === 'user' ? 'flex-row-reverse' : 'flex-row'
                        } flex items-end gap-2`}>
                          {/* Speaker indicator */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            item.speaker === 'user' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-600 text-gray-200'
                          }`}>
                            {item.speaker === 'user' ? (
                              <Mic className="h-3 w-3" />
                            ) : (
                              <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
                            )}
                          </div>
                          
                          {/* Message bubble */}
                          <div className={`rounded-lg px-3 py-2 shadow-sm transition-all duration-200 ${
                            item.speaker === 'user'
                              ? 'bg-green-600/90 text-white rounded-br-sm'
                              : 'bg-gray-700/80 text-gray-200 border border-gray-600/50 rounded-bl-sm'
                          } ${!item.isFinal ? 'animate-pulse border-dashed' : ''}`}>
                            <div className="text-sm leading-relaxed break-words">{item.text}</div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <span className="text-xs opacity-60">
                                {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="flex items-center gap-1">
                                {!item.isFinal && (
                                  <span className="text-xs opacity-50 italic">•••</span>
                                )}
                                <span className={`text-xs font-medium ${
                                  item.speaker === 'user' ? 'text-green-200' : 'text-gray-400'
                                }`}>
                                  {item.speaker === 'user' ? 'You' : 'AI'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {transcriptionMessages.length === 0 && (
                      <div className="text-green-300 text-center py-12">
                        <div className="animate-pulse mb-4">
                          <Mic className="h-12 w-12 mx-auto opacity-30 text-green-400" />
                        </div>
                        <p className="text-sm font-medium">Live Transcription Ready</p>
                        <p className="text-xs mt-1 opacity-70">Start speaking to see real-time transcription</p>
                        <div className="flex justify-center gap-1 mt-3">
                          <div className="w-1 h-1 bg-green-400/50 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-green-400/50 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                          <div className="w-1 h-1 bg-green-400/50 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Auto-scroll anchor */}
                  <div ref={transcriptionEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800/95 border border-green-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Upload className="h-5 w-5 text-green-400" />
                  Upload Document
                </h3>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-green-300 hover:text-lime-400 hover:bg-green-500/20 rounded p-1 transition-colors"
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