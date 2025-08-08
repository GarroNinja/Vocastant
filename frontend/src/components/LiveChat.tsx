import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Send, Bot, User, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { useAppStore } from '../store/useAppStore'

import { useRoomContext } from '@livekit/components-react'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  isVoice: boolean
  isTyping?: boolean
}

export const LiveChat: React.FC = () => {
  const { voiceState, setVoiceState } = useAppStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const room = useRoomContext()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: 'Hello! I\'m Vocastant, your AI voice assistant. I can help you analyze documents and answer questions. How can I assist you today?',
          role: 'assistant',
          timestamp: new Date(),
          isVoice: false
        }
      ])
    }
  }, [])

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: inputValue.trim(),
        role: 'user',
        timestamp: new Date(),
        isVoice: false
      }
      
      setMessages(prev => [...prev, userMessage])
      setInputValue('')
      
      // Add typing indicator
      const typingMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: '...',
        role: 'assistant',
        timestamp: new Date(),
        isVoice: false,
        isTyping: true
      }
      setMessages(prev => [...prev, typingMessage])
      
      // Simulate AI response (replace with actual LiveKit integration)
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.isTyping ? {
            ...msg,
            content: 'I received your message. This is a placeholder response. In the full implementation, this would be the AI\'s actual response.',
            isTyping: false
          } : msg
        ))
      }, 2000)
      
      // Send message to LiveKit agent via data channel
      try {
        if (room && room.localParticipant) {
          room.localParticipant.publishData(
            new TextEncoder().encode(inputValue.trim()),
            { topic: 'chat-message' }
          )
          console.log('✅ Message sent to LiveKit agent:', inputValue.trim())
        }
      } catch (error) {
        console.error('❌ Failed to send message to LiveKit:', error)
      }
    }
  }

  const toggleListening = () => {
    setIsListening(!isListening)
    setVoiceState({ isListening: !isListening })
    
    if (!isListening) {
      // Start listening - show transcript
      setTranscript('Listening...')
    } else {
      setTranscript('')
    }
  }

  const toggleSpeaking = () => {
    setIsSpeaking(!isSpeaking)
    setVoiceState({ isSpeaking: !isSpeaking })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className="w-full h-full flex flex-col bg-gradient-to-br from-background to-muted/20 border-0 shadow-xl">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Live Chat
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant={voiceState.isConnected ? "default" : "secondary"} className="px-3 py-1">
              {voiceState.isConnected ? "Connected" : "Disconnected"}
            </Badge>
            {isListening && (
              <Badge variant="destructive" className="animate-pulse px-3 py-1">
                <Mic className="h-3 w-3 mr-1" />
                Listening
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`flex items-start gap-3 max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                
                {/* Message Content */}
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border/50'
                  } ${message.isTyping ? 'animate-pulse' : ''}`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs ${
                      message.role === 'user' ? 'opacity-70' : 'text-muted-foreground'
                    }`}>
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
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Live Transcript */}
        {transcript && (
          <div className="border-t border-border/50 p-4 bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mic className="h-4 w-4" />
              <span className="font-medium">Live Transcript:</span>
              <span className="italic">"{transcript}"</span>
            </div>
          </div>
        )}

        {/* Voice Controls */}
        <div className="border-t border-border/50 p-4 bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="lg"
              onClick={toggleListening}
              disabled={!voiceState.isConnected}
              className="flex-1 h-12 text-lg font-medium"
            >
              {isListening ? (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Start Listening
                </>
              )}
            </Button>
            
            <Button
              variant={isSpeaking ? "destructive" : "outline"}
              size="icon"
              onClick={toggleSpeaking}
              disabled={!voiceState.isConnected}
              className="h-12 w-12"
            >
              {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>

          {/* Text Input */}
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message or use voice..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 h-12 text-base border-border/50 focus:border-primary"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim()}
              size="lg"
              className="h-12 px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
