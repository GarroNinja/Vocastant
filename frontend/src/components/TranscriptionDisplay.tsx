import React, { useState, useEffect, useRef } from 'react'
import { Mic } from 'lucide-react'
import { useRoomContext } from '@livekit/components-react'

interface TranscriptionMessage {
  id: string
  text: string
  timestamp: Date
  speaker: 'user' | 'agent'
  isFinal: boolean
}

export const TranscriptionDisplay: React.FC = () => {
  const room = useRoomContext()
  const [transcriptions, setTranscriptions] = useState<TranscriptionMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [transcriptions])

  useEffect(() => {
    if (!room) return

    const handleTextStreamData = async (reader: any, participantInfo: any) => {
      try {
        const message = await reader.readAll()
        
        // Check if this is a transcription message
        if (reader.info.attributes?.['lk.transcribed_track_id']) {
          const speaker = participantInfo.identity.includes('agent') || participantInfo.kind === 'agent' ? 'agent' : 'user'
          const isFinal = reader.info.attributes?.['lk.final'] === 'true'
          
          const transcriptionMessage: TranscriptionMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: message,
            timestamp: new Date(),
            speaker,
            isFinal
          }

          setTranscriptions(prev => {
            // If not final, update the latest message from this speaker if it exists
            if (!isFinal) {
              const lastMessage = prev[prev.length - 1]
              if (lastMessage && lastMessage.speaker === speaker && !lastMessage.isFinal) {
                return [...prev.slice(0, -1), { ...lastMessage, text: message }]
              }
            }
            return [...prev, transcriptionMessage]
          })

          console.log(`📝 Transcription from ${speaker}: ${message} (final: ${isFinal})`)
        }
      } catch (error) {
        console.error('❌ Error processing transcription stream:', error)
      }
    }

    // Register text stream handler for transcriptions
    room.registerTextStreamHandler('lk.transcription', handleTextStreamData)

    return () => {
      // Clean up text stream handler
      room.unregisterTextStreamHandler('lk.transcription', handleTextStreamData)
    }
  }, [room])

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-lime-500/20 flex-shrink-0">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Mic className="h-4 w-4 text-lime-400" />
          Live Transcription
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto transcription-scroll">
        <div className="p-4 space-y-3">
          {transcriptions.map(item => (
            <div key={item.id} className={`flex ${
              item.speaker === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`max-w-[85%] group ${
                item.speaker === 'user' ? 'flex-row-reverse' : 'flex-row'
              } flex items-end gap-2`}>
                {/* Speaker indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.speaker === 'user' 
                    ? 'bg-lime-600 text-black' 
                    : 'bg-gray-700 text-gray-200'
                }`}>
                  {item.speaker === 'user' ? (
                    <Mic className="h-3 w-3" />
                  ) : (
                    <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
                  )}
                </div>
                
                {/* Message bubble */}
                <div className={`rounded-lg px-3 py-2 shadow-sm transition-opacity duration-200 break-words overflow-hidden ${
                  item.speaker === 'user'
                    ? 'bg-lime-600/90 text-black rounded-br-sm'
                    : 'bg-gray-800/80 text-gray-200 border border-gray-600/50 rounded-bl-sm'
                } ${!item.isFinal ? 'opacity-70' : 'opacity-100'}`}>
                  <div className="text-sm leading-relaxed word-break">{item.text}</div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs opacity-60">
                      {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-1">
                      {!item.isFinal && (
                        <span className="text-xs opacity-50 italic">...</span>
                      )}
                      <span className={`text-xs font-medium ${
                        item.speaker === 'user' ? 'text-black/70' : 'text-gray-400'
                      }`}>
                        {item.speaker === 'user' ? 'You' : 'AI'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {transcriptions.length === 0 && (
            <div className="text-lime-300 text-center py-12">
              <div className="animate-pulse mb-4">
                <Mic className="h-12 w-12 mx-auto opacity-30 text-lime-400" />
              </div>
              <p className="text-sm font-medium">Live Transcription Ready</p>
              <p className="text-xs mt-1 opacity-70">Start speaking to see real-time transcription</p>
              <div className="flex justify-center gap-1 mt-3">
                <div className="w-1 h-1 bg-lime-400/50 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-lime-400/50 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                <div className="w-1 h-1 bg-lime-400/50 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
              </div>
            </div>
          )}
        </div>
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}