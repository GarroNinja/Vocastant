import { useEffect, useContext, useRef, useCallback } from 'react'
import { RoomContext } from '@livekit/components-react'
import { 
  RoomEvent, 
  TrackPublication, 
  Participant, 
  Room, 
  ParticipantKind,
  TranscriptionSegment
} from 'livekit-client'
import { useAppStore } from '../store/useAppStore'
import { TranscriptionMessage } from '../types'

export const TranscriptionHandler: React.FC = () => {
  const room = useContext(RoomContext) as unknown as Room | undefined
  const { addTranscriptionMessage, updateTranscriptionMessage } = useAppStore()
  const inProgressIdsRef = useRef<{ [speaker in 'user' | 'agent']?: string }>({})

  useEffect(() => {
    if (!room) return

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: Participant,
      _kind?: any,
      _topic?: string
    ) => {
      try {
        const decoder = new TextDecoder()
        const message = decoder.decode(payload)
        
        console.log('🎙️ Data received from participant:', participant?.identity, message)
        
        // Try to parse as JSON first (for structured data from agent)
        try {
          const data = JSON.parse(message)
          
          // Handle different types of transcription data
          if (data.type === 'transcription' || data.transcript) {
            const transcriptText = data.transcript || data.text || data.message
            if (transcriptText && transcriptText.trim()) {
              const speaker = participant?.kind === ParticipantKind.AGENT ? 'agent' as const : 'user' as const
              const isFinal = data.is_final === true || data.final === true

              // Update existing in-progress message or create one
              const existingId = inProgressIdsRef.current[speaker]
              if (existingId && !isFinal) {
                updateTranscriptionMessage(existingId, { text: transcriptText, timestamp: new Date(), isFinal: false })
              } else if (existingId && isFinal) {
                updateTranscriptionMessage(existingId, { text: transcriptText, timestamp: new Date(), isFinal: true })
                inProgressIdsRef.current[speaker] = undefined
              } else if (!existingId) {
                const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                const transcriptionMessage: TranscriptionMessage = {
                  id: newId,
                  text: transcriptText,
                  timestamp: new Date(),
                  speaker,
                  isFinal: Boolean(isFinal)
                }
                addTranscriptionMessage(transcriptionMessage)
                if (!isFinal) {
                  inProgressIdsRef.current[speaker] = newId
                }
              }
            }
          }
        } catch (jsonError) {
          // If not JSON, treat as plain text transcription
          const text = message.trim()
          if (text) {
            const speaker = participant?.kind === ParticipantKind.AGENT ? 'agent' as const : 'user' as const
            const existingId = inProgressIdsRef.current[speaker]
            if (existingId) {
              updateTranscriptionMessage(existingId, { text, timestamp: new Date() })
            } else {
              const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              addTranscriptionMessage({ id: newId, text, timestamp: new Date(), speaker, isFinal: false })
              inProgressIdsRef.current[speaker] = newId
            }
          }
        }
      } catch (error) {
        console.error('❌ Error processing transcription data:', error)
      }
    }

    const handleTrackSubscribed = (
      _track: any,
      publication: TrackPublication,
      participant: Participant
    ) => {
      console.log('🔔 Track subscribed:', {
        kind: publication.kind,
        source: publication.source,
        participant: participant.identity
      })
      
      // Handle audio tracks for transcription monitoring
      if (publication.kind === 'audio') {
        console.log(`🎤 ${participant.identity} audio track subscribed`)
        
        // Listen for track muted/unmuted events
        publication.on('muted', () => {
          console.log(`🔇 ${participant.identity} muted audio`)
        })
        
        publication.on('unmuted', () => {
          console.log(`🔊 ${participant.identity} unmuted audio`)
        })
      }
    }

    const handleParticipantConnected = (participant: Participant) => {
      console.log('👋 Participant connected:', participant.identity)
      
      // Listen for data from this participant
      participant.on('dataReceived', (payload: Uint8Array, kind: any) => {
        handleDataReceived(payload, participant, kind)
      })
    }

    // Add event listeners  
    room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: Participant, kind?: any, topic?: string) => {
      handleDataReceived(payload, participant, kind, topic)
    })
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)

    // Enhanced LiveKit native transcription events handler
    const handleTranscriptionReceived = useCallback((
      transcriptionSegments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      try {
        console.log('🎯 Transcription received:', { 
          segments: transcriptionSegments.length, 
          participant: participant?.identity 
        })
        
        transcriptionSegments.forEach((segment) => {
          const text = segment.text.trim()
          if (!text) return

          // Determine speaker based on participant info
          let speaker: 'user' | 'agent' = 'user'
          if (participant) {
            speaker = participant.kind === ParticipantKind.AGENT || participant.identity.includes('agent') 
              ? 'agent' : 'user'
          }

          const isFinal = Boolean(segment.final)
          const existingId = inProgressIdsRef.current[speaker]

          if (existingId && !isFinal) {
            // Update existing partial transcription
            updateTranscriptionMessage(existingId, { 
              text, 
              timestamp: new Date(), 
              isFinal: false 
            })
          } else if (existingId && isFinal) {
            // Finalize existing transcription
            updateTranscriptionMessage(existingId, { 
              text, 
              timestamp: new Date(), 
              isFinal: true 
            })
            inProgressIdsRef.current[speaker] = undefined
          } else {
            // Create new transcription message
            const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const transcriptionMessage: TranscriptionMessage = {
              id: newId,
              text,
              timestamp: new Date(),
              speaker,
              isFinal
            }
            addTranscriptionMessage(transcriptionMessage)
            
            if (!isFinal) {
              inProgressIdsRef.current[speaker] = newId
            }
          }
        })
      } catch (e) {
        console.error('❌ Error handling LiveKit TranscriptionReceived:', e)
      }
    }, [addTranscriptionMessage, updateTranscriptionMessage])

    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)
    
    // Handle existing participants
    room.remoteParticipants.forEach((participant) => {
      participant.on('dataReceived', (payload: Uint8Array, kind: any) => {
        handleDataReceived(payload, participant, kind)
      })
    })

    console.log('🎯 Transcription handler initialized for room:', room.name)
    
    return () => {
      // Clean up event listeners
      room.off(RoomEvent.DataReceived, (payload: Uint8Array, participant?: Participant, kind?: any, topic?: string) => {
        handleDataReceived(payload, participant, kind, topic)
      })
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)
      
      console.log('🧹 Transcription handler cleanup completed')
    }
  }, [room, addTranscriptionMessage, updateTranscriptionMessage])

  return null // This is a utility component with no UI
}