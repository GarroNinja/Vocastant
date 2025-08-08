import { create } from 'zustand'
import { Document, Message, Session, VoiceState } from '../types'

interface AppState {
  // Session state
  session: Session | null
  isConnected: boolean
  
  // Documents
  documents: Document[]
  selectedDocument: Document | null
  
  // Messages
  messages: Message[]
  
  // Voice state
  voiceState: VoiceState
  
  // Actions
  setSession: (session: Session) => void
  addDocument: (document: Document) => void
  removeDocument: (documentId: string) => void
  updateDocument: (documentId: string, updates: Partial<Document>) => void
  setDocuments: (documents: Document[]) => void
  selectDocument: (document: Document | null) => void
  addMessage: (message: Message) => void
  clearMessages: () => void
  setVoiceState: (state: Partial<VoiceState>) => void
  setConnected: (connected: boolean) => void
  reset: () => void
}

const initialState = {
  session: null,
  isConnected: false,
  documents: [],
  selectedDocument: null,
  messages: [],
  voiceState: {
    isListening: false,
    isSpeaking: false,
    isConnected: false,
    transcript: '',
  } as VoiceState,
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  
  setSession: (session) => set({ session }),
  
  addDocument: (document) => set((state) => ({
    documents: [...state.documents, document],
    selectedDocument: state.selectedDocument || document,
  })),
  
  removeDocument: (documentId) => set((state) => ({
    documents: state.documents.filter(doc => doc.id !== documentId),
    selectedDocument: state.selectedDocument?.id === documentId ? null : state.selectedDocument,
  })),
  
  updateDocument: (documentId: string, updates: Partial<Document>) => set((state) => ({
    documents: state.documents.map(doc => 
      doc.id === documentId ? { ...doc, ...updates } : doc
    ),
    selectedDocument: state.selectedDocument?.id === documentId 
      ? { ...state.selectedDocument, ...updates }
      : state.selectedDocument,
  })),
  
  setDocuments: (documents) => set({ documents }),
  
  selectDocument: (document) => set({ selectedDocument: document }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  
  clearMessages: () => set({ messages: [] }),
  
  setVoiceState: (newState) => set((state) => ({
    voiceState: { ...state.voiceState, ...newState },
  })),
  
  setConnected: (connected) => set({ isConnected: connected }),
  
  reset: () => set(initialState),
})) 