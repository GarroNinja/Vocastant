import React, { useState } from 'react'
import { BookOpen, MessageCircle, Upload, Mic, Sparkles, Menu, X } from 'lucide-react'
import { ModernDocumentUpload } from './components/ModernDocumentUpload'
import { ModernDocumentViewer } from './components/ModernDocumentViewer'
import { LiveChat } from './components/LiveChat'
import { ModernVoiceConnection } from './components/ModernVoiceConnection'
import { LiveKitProvider } from './components/LiveKitProvider'
import { StartPage } from './components/StartPage'
import { ThemeToggle } from './components/ui/theme-toggle'
import { useAppStore } from './store/useAppStore'
import { useTheme } from './contexts/ThemeContext'
import { apiService } from './services/api'

const App: React.FC = () => {
  const { documents, isConnected, setDocuments } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Load existing documents from backend on app start
  React.useEffect(() => {
    if (isConnected) {
      const loadDocuments = async () => {
        try {
          const backendDocuments = await apiService.getDocuments()
          
          // Convert backend documents to frontend format
          const convertedDocs = backendDocuments.map(doc => ({
            id: doc.id,
            name: doc.originalName,
            type: doc.type as 'pdf' | 'docx' | 'txt' | 'md',
            size: doc.size,
            uploadedAt: new Date(doc.uploadedAt),
            status: 'ready' as const
          }))
          
          setDocuments(convertedDocs)
          console.log('Loaded existing documents from backend:', convertedDocs)
        } catch (error) {
          console.error('Failed to load existing documents:', error)
        }
      }
      
      loadDocuments()
    }
  }, [isConnected, setDocuments])

  // Show start page if not connected
  if (!isConnected) {
    return <StartPage />
  }

    return (
    <LiveKitProvider>
      <div className="min-h-screen bg-background text-foreground">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                {/* Logo and Title */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 hover:bg-muted rounded-lg"
                  >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                  
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary-foreground" />
                  </div>
                  
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Vocastant
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      AI Voice Assistant for Document Analysis
                    </p>
                  </div>
                </div>
                
                {/* Right Side Controls */}
                <div className="flex items-center gap-3">
                  {/* Connection Status */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-gray-400'
                    } animate-pulse`} />
                    <span className="text-sm text-muted-foreground">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  
                  {/* Theme Toggle */}
                  <ThemeToggle theme={theme} onThemeChange={setTheme} />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex">
            {/* Sidebar - Documents */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-80 bg-card border-r border-border/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <div className="h-full overflow-y-auto p-6 space-y-6">
                {/* Document Upload */}
                <ModernDocumentUpload />
                
                {/* Document Viewer */}
                <div className="h-96">
                  <ModernDocumentViewer />
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
              <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Voice Connection */}
                  <div className="xl:col-span-1">
                    <ModernVoiceConnection />
                  </div>
                  
                  {/* Live Chat */}
                  <div className="xl:col-span-1 h-[600px]">
                    <LiveChat />
                  </div>
                </div>

                {/* Quick Actions */}
                {documents.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-card border border-border/50 rounded-xl p-6 text-center hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                          <Mic className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium mb-2">Ask a Question</h4>
                        <p className="text-sm text-muted-foreground">
                          Use voice to ask about your documents
                        </p>
                      </div>
                      
                      <div className="bg-card border border-border/50 rounded-xl p-6 text-center hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium mb-2">Add More Documents</h4>
                        <p className="text-sm text-muted-foreground">
                          Upload additional files for analysis
                        </p>
                      </div>
                      
                      <div className="bg-card border border-border/50 rounded-xl p-6 text-center hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                          <MessageCircle className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium mb-2">Start Conversation</h4>
                        <p className="text-sm text-muted-foreground">
                          Begin chatting with your AI assistant
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </LiveKitProvider>
  )
}

export default App 