import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useAppStore } from '../store/useAppStore'
import { 
  VoiceAssistantControlBar, 
  BarVisualizer 
} from '@livekit/components-react'

export const VoiceConnection: React.FC = () => {
  const { voiceState } = useAppStore()
  const [agentStatus, setAgentStatus] = React.useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [lastActivity, setLastActivity] = React.useState<Date | null>(null)

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
        // This will trigger the LiveKitProvider to reconnect
        localStorage.removeItem('livekit-config')
        window.location.reload()
      }, 10000) // Wait 10 seconds before reconnecting
      
      return () => clearTimeout(timer)
    }
  }, [agentStatus, voiceState.isConnected])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Voice Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={
              agentStatus === 'connected' ? "default" : 
              agentStatus === 'connecting' ? "secondary" :
              agentStatus === 'error' ? "destructive" : "secondary"
            }>
              {agentStatus === 'connected' ? "Connected" : 
               agentStatus === 'connecting' ? "Connecting" :
               agentStatus === 'error' ? "Error" : "Disconnected"}
            </Badge>
            {voiceState.error && (
              <Badge variant="destructive">
                {voiceState.error}
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            LiveKit Voice Assistant
          </div>
        </div>

        {/* Agent Status Info */}
        {agentStatus === 'connected' && lastActivity && (
          <div className="text-xs text-muted-foreground text-center">
            Last activity: {lastActivity.toLocaleTimeString()}
          </div>
        )}

        {/* Voice Controls */}
        {voiceState.isConnected && (
          <div className="space-y-4">
            {/* LiveKit Voice Assistant Control Bar */}
            <VoiceAssistantControlBar />
            
            {/* Audio Visualizer */}
            <div className="flex justify-center">
              <BarVisualizer />
            </div>

            {/* Status Info */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Use the control bar above to interact with your voice assistant</p>
              <p className="mt-1">The agent will automatically respond to your voice input</p>
            </div>
          </div>
        )}

        {/* Connection Info */}
        {!voiceState.isConnected && (
          <div className="text-sm text-muted-foreground">
            <p>Connecting to LiveKit to enable voice interactions with your AI assistant.</p>
            <p className="mt-2">
              Once connected, you can:
            </p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Ask questions about your documents using voice</li>
              <li>Receive AI responses through voice</li>
              <li>Have natural conversations with the AI</li>
            </ul>
            
            {/* Connection Info */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-xs mb-2">Connection Info:</p>
              <p className="text-xs">URL: wss://vocastant-8kvolde0.livekit.cloud</p>
              <p className="text-xs">Room: vocastant-room</p>
              <p className="text-xs">Status: Connecting via LiveKitProvider</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
