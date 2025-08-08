import React, { useState } from 'react'
import { 
  RoomContext, 
  RoomAudioRenderer
} from '@livekit/components-react'
import { Room } from 'livekit-client'
import { useAppStore } from '../store/useAppStore'

interface LiveKitProviderProps {
  children: React.ReactNode
}

export const LiveKitProvider: React.FC<LiveKitProviderProps> = ({ children }) => {
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
  React.useEffect(() => {
    const configStr = localStorage.getItem('livekit-config')
    if (configStr) {
      connectToRoom()
    }
  }, [])

  // Listen for custom room config changes (when user creates/joins room)
  React.useEffect(() => {
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
