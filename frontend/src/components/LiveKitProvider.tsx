import { useState, useEffect } from 'react'
import { 
  RoomContext, 
  RoomAudioRenderer
} from '@livekit/components-react'
import { Room } from 'livekit-client'
import { useAppStore } from '../store/useAppStore'

interface LiveKitProviderProps {
  children: React.ReactNode
}

export const LiveKitProvider = ({ children }: LiveKitProviderProps) => {
  const { setConnected, setVoiceState } = useAppStore()
  const [room] = useState(new Room())

  const connectToRoom = async () => {
    try {
      // Get room config from localStorage (set by StartPage)
      const configStr = localStorage.getItem('livekit-config')
      if (!configStr) {
        console.log('No room config found, waiting for user to create/join room')
        return
      }

      const config = JSON.parse(configStr)
      console.log('🔄 Connecting to LiveKit room:', config.roomName)
      console.log('🔑 Token preview:', config.token.substring(0, 20) + '...')
      console.log('🌐 URL:', config.url)
      
      await room.connect(config.url, config.token)
      
      // Enable microphone after connection
      try {
        console.log('🎤 Requesting microphone permissions...')
        
        // First check if we have permission
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        console.log('🔐 Microphone permission status:', permission.state)
        
        if (permission.state === 'denied') {
          throw new Error('Microphone permission denied by user')
        }
        
        // Enable microphone
        await room.localParticipant.setMicrophoneEnabled(true)
        console.log('✅ Microphone enabled successfully')
        
        // Verify audio track is published
        const audioTrack = room.localParticipant.getTrackPublication('microphone' as any)
        if (audioTrack) {
          console.log('📡 Audio track published:', audioTrack.trackSid)
        } else {
          console.warn('⚠️ No audio track found after enabling microphone')
        }
        
      } catch (micError) {
        console.error('❌ Failed to enable microphone:', micError)
        setVoiceState({ 
          error: `Microphone error: ${micError instanceof Error ? micError.message : 'Unknown error'}`,
          isConnected: true
        })
      }
      
      console.log('✅ Connected to LiveKit room:', config.roomName)
      setConnected(true)
      setVoiceState({ 
        isConnected: true,
        isListening: false,
        isSpeaking: false,
        transcript: '',
        error: undefined
      })
    } catch (error) {
      console.error('❌ Failed to connect to LiveKit:', error)
      
      // Check if it's a token error and clear localStorage if so
      const errorMessage = error instanceof Error ? error.message : 'Connection failed'
      if (errorMessage.includes('invalid authorization token') || errorMessage.includes('authorization')) {
        console.log('🔑 Token error detected, clearing localStorage...')
        localStorage.removeItem('livekit-config')
        setConnected(false)
        setVoiceState({ 
          error: 'Invalid or expired token. Please create a new room.',
          isConnected: false
        })
      } else {
        setVoiceState({ 
          error: errorMessage,
          isConnected: false
        })
      }
      setConnected(false)
    }
  }

  // Auto-connect when component mounts or when config changes
  useEffect(() => {
    const configStr = localStorage.getItem('livekit-config')
    if (configStr) {
      connectToRoom()
    }
  }, [])

  // Listen for custom room config changes (when user creates/joins room)
  useEffect(() => {
    const handleRoomConfigChange = (e: CustomEvent) => {
      console.log('🔄 Room config changed, connecting...', e.detail)
      connectToRoom()
    }

    window.addEventListener('roomConfigChanged', handleRoomConfigChange as EventListener)
    return () => window.removeEventListener('roomConfigChanged', handleRoomConfigChange as EventListener)
  }, [])

  return (
    <RoomContext.Provider value={room}>
      {children}
      <RoomAudioRenderer />
    </RoomContext.Provider>
  )
}