import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { BookOpen, Plus, LogIn } from 'lucide-react'
import { roomService } from '../services/roomService'
import { useAppStore } from '../store/useAppStore'

export const StartPage: React.FC = () => {
  const { setConnected } = useAppStore()
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [showTokenInput, setShowTokenInput] = useState(false)

  // Clear any old room configuration on component mount
  React.useEffect(() => {
    console.log('🧹 Clearing old room configuration...')
    localStorage.removeItem('livekit-config')
    setConnected(false)
  }, [setConnected])

  const handleCreateRoom = async () => {
    if (!participantName.trim()) {
      setError('Please enter your name')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const config = await roomService.createRoom({
        roomName: roomName || roomService.generateRoomName(), // Use generated name if empty
        participantName: participantName.trim(),
        token: token.trim() || undefined
      })

      // Store the room config and navigate to the main app
      localStorage.setItem('livekit-config', JSON.stringify(config))
      
      // Dispatch custom event to notify LiveKitProvider
      window.dispatchEvent(new CustomEvent('roomConfigChanged', { detail: config }))
      
      setConnected(true)
      
      console.log('Room created successfully:', config)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room'
      setError(errorMessage)
      
      // If it's a token generation error, show the token input
      if (errorMessage.includes('Please generate a token')) {
        setShowTokenInput(true)
      }
      
      console.error('Room creation failed:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomName.trim() || !participantName.trim()) {
      setError('Please enter both room name and your name')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      const config = await roomService.joinRoom({
        roomName: roomName.trim(),
        participantName: participantName.trim(),
        token: token.trim() || undefined
      })

      // Store the room config and navigate to the main app
      localStorage.setItem('livekit-config', JSON.stringify(config))
      
      // Dispatch custom event to notify LiveKitProvider
      window.dispatchEvent(new CustomEvent('roomConfigChanged', { detail: config }))
      
      setConnected(true)
      
      console.log('Joined room successfully:', config)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room'
      setError(errorMessage)
      
      // If it's a token generation error, show the token input
      if (errorMessage.includes('Please generate a token')) {
        setShowTokenInput(true)
      }
      
      console.error('Room join failed:', error)
    } finally {
      setIsJoining(false)
    }
  }

  const generateRoomName = () => {
    const newRoomName = roomService.generateRoomName()
    setRoomName(newRoomName)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Vocastant</h1>
          <p className="text-muted-foreground mt-2">
            AI Voice Assistant for Document Analysis
          </p>
        </div>

        {/* Room Options */}
        <div className="space-y-4">
          {/* Create Room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Room
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Name
                </label>
                <Input
                  placeholder="Enter your name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Room Name (Optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Leave empty for auto-generated name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={generateRoomName}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Token Input - shown after error or optionally */}
              {(showTokenInput || token) && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    LiveKit Token
                  </label>
                  <Input
                    placeholder="Paste your LiveKit token here"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate using: lk token create --room "room-name" --identity "your-name" --join --valid-for "1h"
                  </p>
                </div>
              )}

              {!showTokenInput && !token && (
                <Button
                  onClick={() => setShowTokenInput(true)}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Have a token? Click here
                </Button>
              )}

              <Button
                onClick={handleCreateRoom}
                disabled={isCreating || !participantName.trim()}
                className="w-full"
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </Button>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Join Existing Room
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Room Name
                </label>
                <Input
                  placeholder="Enter room name to join"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Name
                </label>
                <Input
                  placeholder="Enter your name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                />
              </div>

              {/* Token Input - shown after error or optionally */}
              {(showTokenInput || token) && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    LiveKit Token
                  </label>
                  <Input
                    placeholder="Paste your LiveKit token here"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate using: lk token create --room "{roomName || 'room-name'}" --identity "{participantName || 'your-name'}" --join --valid-for "1h"
                  </p>
                </div>
              )}

              {!showTokenInput && !token && (
                <Button
                  onClick={() => setShowTokenInput(true)}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Have a token? Click here
                </Button>
              )}

              <Button
                onClick={handleJoinRoom}
                disabled={isJoining || !roomName.trim() || !participantName.trim()}
                className="w-full"
                variant="outline"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </Button>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Test Button */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="font-medium mb-3 text-green-800">Quick Test</p>
                <Button
                  onClick={() => {
                    // Token generation removed for security - use the form above instead
                    alert('Please use the room creation form above to generate a secure token')
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Quick Test (Disabled)
                </Button>
                <p className="text-xs text-green-700 mt-2">
                  Security: Hardcoded tokens removed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                <p className="font-medium mb-2">How it works:</p>
                <div className="space-y-1">
                  <p>1. Create or join a room</p>
                  <p>2. Upload your documents</p>
                  <p>3. Ask questions via voice</p>
                  <p>4. Get AI-powered responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
