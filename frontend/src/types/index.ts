export interface ConnectionDetails {
  server_url: string;
  room_name: string;
  participant_token: string;
  participant_name: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export interface TTSRequest {
  text: string;
  voice_id: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
}

export interface AppConfig {
  companyName: string;
  pageTitle: string;
  pageDescription: string;
  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;
  agentName?: string;
}

export interface ThemeMode {
  mode: 'light' | 'dark' | 'system';
}

export interface AudioLevel {
  level: number;
  timestamp: number;
}

export interface User {
  id: string
  name: string
  email: string
}

export interface Document {
  id: string
  name: string
  type: 'pdf' | 'docx' | 'txt' | 'md'
  mimeType?: string // Store original MIME type for proper handling
  size: number
  content?: string
  uploadedAt: Date
  status: 'processing' | 'ready' | 'error'
}

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  isVoice?: boolean
  documentContext?: string[]
}

export interface Session {
  id: string
  documents: Document[]
  messages: Message[]
  isConnected: boolean
  isListening: boolean
  isSpeaking: boolean
}

export interface VoiceState {
  isListening: boolean
  isSpeaking: boolean
  isConnected: boolean
  transcript: string
  error?: string
}

export interface TranscriptionMessage {
  id: string
  text: string
  timestamp: Date
  speaker: 'user' | 'agent'
  isFinal: boolean
} 