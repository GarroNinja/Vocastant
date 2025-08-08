import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, Mic, MicOff, Volume2, VolumeX, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { useAppStore } from '../store/useAppStore'
import { Message } from '../types'
import { useRoomContext } from '@livekit/components-react'

export const ChatPanel: React.FC = () => {
  const { messages, voiceState, addMessage, setVoiceState } = useAppStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const room = useRoomContext()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const message: Message = {
        id: crypto.randomUUID(),
        content: inputValue.trim(),
        role: 'user',
        timestamp: new Date(),
        isVoice: false
      }
      addMessage(message)
      setInputValue('')
      
      // Send message to LiveKit agent via data channel
      try {
        if (room && room.localParticipant) {
          // Send data message to the agent
          room.localParticipant.publishData(
            new TextEncoder().encode(inputValue.trim()),
            { topic: 'chat-message' }
          )
          console.log('✅ Message sent to LiveKit agent via data channel:', inputValue.trim())
        } else {
          console.warn('⚠️ LiveKit room not available, message not sent')
        }
      } catch (error) {
        console.error('❌ Failed to send message to LiveKit:', error)
      }
    }
  }

  const toggleListening = () => {
    setVoiceState({ isListening: !voiceState.isListening })
  }

  const toggleSpeaking = () => {
    setVoiceState({ isSpeaking: !voiceState.isSpeaking })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className="w-full h-full flex flex-col min-h-0">
      <CardHeader className="border-b flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat with AI
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={voiceState.isConnected ? "default" : "secondary"}>
            {voiceState.isConnected ? "Connected" : "Disconnected"}
          </Badge>
          {voiceState.isListening && (
            <Badge variant="destructive" className="animate-pulse">
              Listening...
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages - Fixed height with scrolling */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation by typing a message or using voice</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.isVoice && (
                      <Badge variant="outline" className="text-xs">
                        Voice
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Controls */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant={voiceState.isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleListening}
              disabled={!voiceState.isConnected}
            >
              {voiceState.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant={voiceState.isSpeaking ? "destructive" : "outline"}
              size="icon"
              onClick={toggleSpeaking}
              disabled={!voiceState.isConnected}
            >
              {voiceState.isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            {voiceState.transcript && (
              <div className="flex-1 text-sm text-muted-foreground">
                "{voiceState.transcript}"
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 