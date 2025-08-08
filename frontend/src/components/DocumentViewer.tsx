import React from 'react'
import { FileText, Search, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { useAppStore } from '../store/useAppStore'
import { Document } from '../types'

export const DocumentViewer: React.FC = () => {
  const { documents, selectedDocument, selectDocument } = useAppStore()
  const [searchQuery, setSearchQuery] = React.useState('')

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getFileIcon = (type: Document['type']) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'docx': return '📝'
      case 'md': return '📋'
      case 'txt': return '📄'
      default: return '📄'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (documents.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No Documents Yet
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Upload some documents to get started. You can then ask questions about their content using voice or text.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredDocuments.map((doc) => (
          <Card
            key={doc.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedDocument?.id === doc.id
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => selectDocument(doc)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{getFileIcon(doc.type)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {doc.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(doc.uploadedAt)}
                    </span>
                  </div>
                  {doc.status === 'processing' && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                      <span className="text-xs text-muted-foreground">Processing...</span>
                    </div>
                  )}
                </div>
                {doc.status === 'ready' && (
                  <Badge variant="default" className="text-xs">
                    Ready
                  </Badge>
                )}
                {doc.status === 'error' && (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document Content Preview */}
      {selectedDocument && selectedDocument.status === 'ready' && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {selectedDocument.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <p className="text-sm text-muted-foreground">
                {selectedDocument.content || 
                  `This ${selectedDocument.type.toUpperCase()} file is ready for analysis. You can ask questions about its content using voice or text.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
