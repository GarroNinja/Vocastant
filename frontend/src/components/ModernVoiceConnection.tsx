import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useAppStore } from '../store/useAppStore'
import { 
  VoiceAssistantControlBar, 
  BarVisualizer 
} from '@livekit/components-react'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff, 
  Activity,
  Clock
} from 'lucide-react'

export const ModernVoiceConnection: React.FC = () => {
  const { voiceState, setVoiceState } = useAppStore()
  const [agentStatus, setAgentStatus] = React.useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [lastActivity, setLastActivity] = React.useState<Date | null>(null)
  const [isListening, setIsListening] = React.useState(false)
  const [isSpeaking, setIsSpeaking] = React.useState(false)

  // Monitor agent status
  React.useEffect(() => {
    if (voiceState.isConnected) {
      setAgentStatus('connected')
      setLastActivity(new Date())
    } else if (voiceState.error) {
      setAgentStatus('error')
    } else {
      setAgentStatus('disconnected')
    }
  }, [voiceState.isConnected, voiceState.error])

  // Auto-reconnect if agent dies
  React.useEffect(() => {
    if (agentStatus === 'disconnected' && voiceState.isConnected) {
      const timer = setTimeout(() => {
        console.log('Agent appears disconnected, attempting reconnection...')
        localStorage.removeItem('livekit-config')
        window.location.reload()
      }, 10000)
      
      return () => clearTimeout(timer)
    }
  }, [agentStatus, voiceState.isConnected])

  const toggleListening = () => {
    setIsListening(!isListening)
    setVoiceState({ isListening: !isListening })
  }

  const toggleSpeaking = () => {
    setIsSpeaking(!isSpeaking)
    setVoiceState({ isSpeaking: !isSpeaking })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting'
      case 'error': return 'Error'
      default: return 'Disconnected'
    }
  }

  return (
    <Card className="w-full bg-gradient-to-br from-background to-muted/20 border-0 shadow-xl">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            Voice Assistant
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(agentStatus)} animate-pulse`} />
            <Badge variant={
              agentStatus === 'connected' ? "default" : 
              agentStatus === 'connecting' ? "secondary" :
              agentStatus === 'error' ? "destructive" : "secondary"
            }>
              {getStatusText(agentStatus)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wifi className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-medium mb-1">Connection</h4>
            <p className="text-sm text-muted-foreground">
              {voiceState.isConnected ? 'LiveKit Connected' : 'Disconnected'}
            </p>
          </div>
          
          <div className="bg-card border border-border/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-medium mb-1">Agent Status</h4>
            <p className="text-sm text-muted-foreground">
              {getStatusText(agentStatus)}
            </p>
          </div>
          
          <div className="bg-card border border-border/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-medium mb-1">Last Activity</h4>
            <p className="text-sm text-muted-foreground">
              {lastActivity ? lastActivity.toLocaleTimeString() : 'Never'}
            </p>
          </div>
        </div>

        {/* Voice Controls */}
        {voiceState.isConnected ? (
          <div className="space-y-6">
            {/* LiveKit Voice Assistant Control Bar */}
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h4 className="font-medium mb-3 text-center">Voice Controls</h4>
              <VoiceAssistantControlBar />
            </div>
            
            {/* Custom Voice Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="lg"
                onClick={toggleListening}
                className="h-16 text-lg font-medium"
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
                size="lg"
                onClick={toggleSpeaking}
                className="h-16 text-lg font-medium"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-5 w-5 mr-2" />
                    Mute Output
                  </>
                ) : (
                  <>
                    <Volume2 className="h-5 w-5 mr-2" />
                    Enable Output
                  </>
                )}
              </Button>
            </div>

            {/* Audio Visualizer */}
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h4 className="font-medium mb-3 text-center">Audio Activity</h4>
              <div className="flex justify-center">
                <BarVisualizer />
              </div>
            </div>

            {/* Status Info */}
            <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
              <p className="font-medium mb-2">Voice Assistant Ready</p>
              <p>Use the controls above to interact with your AI assistant</p>
              <p className="mt-1">The agent will automatically respond to your voice input</p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-2">Connecting to Voice Assistant</h4>
              <p className="text-muted-foreground mb-4">
                Establishing connection to LiveKit to enable voice interactions
              </p>
            </div>

            {/* Connection Info */}
            <div className="bg-muted/30 rounded-lg p-4 text-left max-w-md mx-auto">
              <h5 className="font-medium text-sm mb-2">Connection Details:</h5>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>URL: wss://vocastant-8kvolde0.livekit.cloud</p>
                <p>Status: Connecting via LiveKitProvider</p>
                <p>Agent: Vocastant AI Assistant</p>
              </div>
            </div>

            {voiceState.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive text-sm font-medium">Connection Error:</p>
                <p className="text-destructive/80 text-sm">{voiceState.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
