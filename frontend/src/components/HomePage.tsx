import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ArrowRight, Users, FileText, Mic, LogIn } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { roomService } from '../services/roomService'
import { useAppStore } from '../store/useAppStore'
import { apiService } from '../services/api'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { setConnected, setDocuments } = useAppStore()
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  
  // Form states
  const [participantName, setParticipantName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [error, setError] = useState('')

  // Clear any old room configuration on component mount
  useEffect(() => {
    console.log('🧹 Clearing old room configuration...')
    localStorage.removeItem('livekit-config')
    setConnected(false)
    setDocuments([])
  }, [setConnected, setDocuments])

  const createNewRoom = async () => {
    if (!participantName.trim()) {
      setError('Please enter your name')
      return
    }

    setIsCreatingRoom(true)
    setError('')
    
    try {
      // Create room via backend API
      const config = await roomService.createRoom({
        roomName: roomService.generateRoomName(),
        participantName: participantName.trim()
      })

      // Store the room config
      localStorage.setItem('livekit-config', JSON.stringify(config))
      
      // Set the room context in the API service
      apiService.setRoomContext(config.roomName)
      
      // Dispatch custom event to notify LiveKitProvider
      window.dispatchEvent(new CustomEvent('roomConfigChanged', { detail: config }))
      
      setConnected(true)
      
      console.log('✅ Room created successfully:', config.roomName)
      
      // Navigate to the room
      navigate(`/room/${config.roomName}`)
    } catch (error) {
      console.error('❌ Failed to create room:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room'
      setError(errorMessage)
      setIsCreatingRoom(false)
    }
  }

  const joinExistingRoom = async () => {
    if (!participantName.trim()) {
      setError('Please enter your name')
      return
    }
    
    if (!roomName.trim()) {
      setError('Please enter room name')
      return
    }

    setIsJoiningRoom(true)
    setError('')

    try {
      // Join existing room via backend API
      const config = await roomService.joinRoom({
        roomName: roomName.trim(),
        participantName: participantName.trim()
      })

      // Store the room config
      localStorage.setItem('livekit-config', JSON.stringify(config))
      
      // Set the room context in the API service
      apiService.setRoomContext(config.roomName)
      
      // Dispatch custom event to notify LiveKitProvider
      window.dispatchEvent(new CustomEvent('roomConfigChanged', { detail: config }))
      
      setConnected(true)
      
      console.log('✅ Joined room successfully:', config.roomName)
      
      // Navigate to the room
      navigate(`/room/${config.roomName}`)
    } catch (error) {
      console.error('❌ Failed to join room:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room'
      setError(errorMessage)
      setIsJoiningRoom(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
      {/* Header */}
      <header className="border-b border-green-500/20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-7 w-7 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Vocastant
              </h1>
              <p className="text-sm text-green-200">
                AI Voice Document Assistant
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Hero content */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Voice-Powered
                <br />
                <span className="bg-gradient-to-r from-lime-400 to-green-400 bg-clip-text text-transparent">
                  Document Analysis
                </span>
              </h1>
              <p className="text-xl text-green-200 mb-8">
                Upload documents, ask questions, and get intelligent responses through natural voice conversations with AI.
              </p>
              
              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <FileText className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Document Upload</h3>
                  <p className="text-xs text-green-300">
                    Upload PDFs, Word docs, and text files
                  </p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <Mic className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Voice Interaction</h3>
                  <p className="text-xs text-green-300">
                    Speak naturally to ask questions
                  </p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <BookOpen className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">AI Analysis</h3>
                  <p className="text-xs text-green-300">
                    Get summaries and intelligent responses
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Action form */}
            <div className="max-w-md mx-auto w-full">
              <Card className="bg-gray-800/90 border-green-500/20 shadow-2xl backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-center gap-3 text-white text-xl">
                    <LogIn className="h-6 w-6 text-lime-400" />
                    Join Session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-green-200 mb-3 block">
                      Your Name
                    </label>
                    <Input
                      placeholder="Enter your name"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      className="bg-gray-700 border-green-500/30 text-white placeholder:text-gray-400 focus:border-lime-400"
                    />
                  </div>
                  
                  {showJoinForm && (
                    <div>
                      <label className="text-sm font-medium text-green-200 mb-3 block">
                        Room Name
                      </label>
                      <Input
                        placeholder="Enter room name to join"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="bg-gray-700 border-green-500/30 text-white placeholder:text-gray-400 focus:border-lime-400"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {!showJoinForm ? (
                      <>
                        <Button
                          onClick={createNewRoom}
                          disabled={isCreatingRoom || !participantName.trim()}
                          className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-400 hover:to-green-400 text-gray-900 font-semibold py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {isCreatingRoom ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                              Creating Session...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-5 w-5" />
                              Start New Session
                            </div>
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => setShowJoinForm(true)}
                          variant="outline"
                          className="w-full border-green-500/30 text-green-300 hover:bg-green-500/10 hover:border-lime-400 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Join Existing Room
                          </div>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={joinExistingRoom}
                          disabled={isJoiningRoom || !participantName.trim() || !roomName.trim()}
                          className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-400 hover:to-green-400 text-gray-900 font-semibold py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {isJoiningRoom ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                              Joining Room...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              Join Room
                            </div>
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => {setShowJoinForm(false); setRoomName(''); setError('')}}
                          variant="outline"
                          className="w-full border-green-500/30 text-green-300 hover:bg-green-500/10 hover:border-lime-400 py-2 text-sm"
                        >
                          ← Back to New Session
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <Card className="mt-4 bg-red-900/90 border-red-500/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="text-center text-red-200">
                      <p className="font-medium text-red-300">Error</p>
                      <p className="text-sm mt-1">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-green-500/20 bg-black/20 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center text-green-300">
            <p>&copy; 2024 Vocastant. AI-powered document analysis through voice interaction.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage